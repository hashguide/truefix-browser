/**
 * AI Service - Handles workflow generation, validation, and repair
 */

import axios from 'axios'
import config from '@config/index'
import {
  AIPromptResponse,
  AIValidationResponse,
  AIRepairResponse,
  AIError,
  SelectorMap,
  ValidationRule,
} from '@mytypes/index'
import logger from '@logging/logger'

interface AIRequestPayload {
  model: string
  messages: Array<{
    role: 'system' | 'user'
    content: string
  }>
  temperature: number
  max_tokens: number
}

export class AIService {
  private apiKey: string
  private model: string
  private baseUrl = 'https://api.openai.com/v1'

  constructor() {
    this.apiKey = config.ai.apiKey
    this.model = config.ai.model

    if (!this.apiKey) {
      logger.warn('AI_ENABLED is true but OPENAI_API_KEY is not set')
    }
  }

  /**
   * Generate a workflow from a website
   */
  async discoverWorkflow(
    websiteContent: {
      url: string
      html: string
      screenshot?: string
    },
    task: string
  ): Promise<AIPromptResponse> {
    if (!config.ai.enabled) {
      throw new AIError('AI is disabled in configuration')
    }

    const prompt = `
You are an expert web automation engineer. Your task is to analyze a website and generate a Playwright workflow.

Website URL: ${websiteContent.url}
Task: ${task}

HTML Content:
\`\`\`html
${this.truncateContent(websiteContent.html, 10000)}
\`\`\`

Based on the website structure, provide a JSON response with:
1. steps: Array of automation steps (navigate, click, input, wait, extract)
2. selectors: Map of logical names to CSS selectors
3. validationRules: Rules to validate extracted data
4. confidence: Your confidence score (0-1)

Focus on:
- Reliable CSS selectors (prefer data attributes over classes/ids)
- Appropriate wait times for dynamic content
- Clear extraction of all required data
- Error handling steps

Respond with ONLY valid JSON, no markdown or extra text.
`

    try {
      const response = await this.callOpenAI([
        {
          role: 'system',
          content: 'You are a web automation expert. Generate only valid JSON responses.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ])

      const parsed = JSON.parse(response)
      logger.info({ url: websiteContent.url, confidence: parsed.confidence }, 'Workflow discovered')
      return parsed as AIPromptResponse
    } catch (err) {
      throw new AIError('Failed to discover workflow from AI', {
        task,
        originalError: (err as Error).message,
      })
    }
  }

  /**
   * Validate extraction results
   */
  async validateResults(
    results: Record<string, unknown>,
    validationRules: ValidationRule[]
  ): Promise<AIValidationResponse> {
    if (!config.ai.enabled) {
      throw new AIError('AI is disabled in configuration')
    }

    const prompt = `
You are a data validation expert. Analyze the following extracted data and determine if it's valid.

Validation Rules:
${JSON.stringify(validationRules, null, 2)}

Extracted Data:
${JSON.stringify(results, null, 2)}

Respond with a JSON object containing:
- isValid: boolean
- confidence: number (0-1)
- issues: string[] of any problems found
- suggestedFixes: string[] of how to fix issues

Respond with ONLY valid JSON.
`

    try {
      const response = await this.callOpenAI([
        {
          role: 'system',
          content: 'You are a data validation expert. Return only valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ])

      const parsed = JSON.parse(response)
      logger.info(
        { isValid: parsed.isValid, confidence: parsed.confidence },
        'Results validated'
      )
      return parsed as AIValidationResponse
    } catch (err) {
      throw new AIError('Failed to validate results', {
        originalError: (err as Error).message,
      })
    }
  }

  /**
   * Self-heal a broken workflow
   */
  async repairWorkflow(
    websiteContent: {
      url: string
      html: string
      screenshot?: string
    },
    previousSelectors: SelectorMap,
    error: string
  ): Promise<AIRepairResponse> {
    if (!config.ai.enabled) {
      throw new AIError('AI is disabled in configuration')
    }

    const prompt = `
You are a web automation repair expert. A workflow failed on this website because selectors changed.

Website URL: ${websiteContent.url}
Failed Selectors:
${JSON.stringify(previousSelectors, null, 2)}

Error: ${error}

Current HTML:
\`\`\`html
${this.truncateContent(websiteContent.html, 10000)}
\`\`\`

Find the new selectors and provide JSON response with:
- updatedSelectors: Map of logical names to new CSS selectors
- updatedSteps: Any updated workflow steps (if needed)
- confidence: Score 0-1
- changeNote: Description of what changed

Respond with ONLY valid JSON.
`

    try {
      const response = await this.callOpenAI([
        {
          role: 'system',
          content:
            'You are a web automation expert. Return only valid JSON with updated selectors.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ])

      const parsed = JSON.parse(response)
      logger.info(
        { url: websiteContent.url, confidence: parsed.confidence },
        'Workflow repaired'
      )
      return parsed as AIRepairResponse
    } catch (err) {
      throw new AIError('Failed to repair workflow', {
        originalError: (err as Error).message,
      })
    }
  }

  /**
   * Extract part information from raw text
   */
  async extractPartInfo(text: string, part: string): Promise<{ quantity: number; isRelevant: boolean }> {
    if (!config.ai.enabled) {
      throw new AIError('AI is disabled in configuration')
    }

    const prompt = `
Extract part information. Does this text describe related to "${part}"?
Text: ${text}

Respond JSON:
{ "isRelevant": boolean, "quantity": number }
`

    try {
      const response = await this.callOpenAI([
        {
          role: 'system',
          content: 'Extract part info. Return only JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ])

      return JSON.parse(response)
    } catch (err) {
      return { quantity: 1, isRelevant: false }
    }
  }

  private async callOpenAI(
    messages: Array<{
      role: 'system' | 'user'
      content: string
    }>
  ): Promise<string> {
    if (!this.apiKey) {
      throw new AIError('OpenAI API key not configured')
    }

    try {
      const payload: AIRequestPayload = {
        model: this.model,
        messages,
        temperature: 0.5,
        max_tokens: 4000,
      }

      const response = await axios.post(`${this.baseUrl}/chat/completions`, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        timeout: 30000,
      })

      const content = response.data.choices?.[0]?.message?.content
      if (!content) {
        throw new Error('No content in AI response')
      }

      return content
    } catch (err) {
      if (axios.isAxiosError(err)) {
        throw new AIError(`OpenAI API error: ${err.response?.status} ${err.message}`, {
          status: err.response?.status,
          data: err.response?.data,
        })
      }
      throw err
    }
  }

  private truncateContent(content: string, maxLen: number): string {
    if (content.length > maxLen) {
      return content.substring(0, maxLen) + '\n... (truncated)'
    }
    return content
  }
}

let aiServiceInstance: AIService

export function getAIService(): AIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService()
  }
  return aiServiceInstance
}
