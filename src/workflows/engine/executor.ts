/**
 * Workflow execution engine
 * Executes workflows step by step using Playwright
 */

import { Page } from 'playwright'
import {
  WorkflowStep,
  NavigateStep,
  ClickStep,
  InputStep,
  ExtractStep,
  EvaluateStep,
  WorkflowError,
  BrowserError,
} from '@mytypes/index'
import logger from '@logging/logger'

interface ExecutionContext {
  page: Page
  results: Record<string, unknown>
  variables: Record<string, unknown>
}

export class WorkflowExecutionEngine {
  constructor(private page: Page) {}

  async execute(
    steps: WorkflowStep[],
    inputData: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const context: ExecutionContext = {
      page: this.page,
      results: {},
      variables: { ...inputData },
    }

    try {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i]
        logger.debug(
          { stepIndex: i, stepType: step.type },
          'Executing workflow step'
        )

        await this.executeStep(step, context)
      }

      return context.results
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      logger.error({ err: error }, 'Workflow execution failed')
      throw new WorkflowError(`Step ${steps.length} failed: ${error.message}`, {
        stepsFailed: steps.length,
        lastStep: steps[steps.length - 1],
      })
    }
  }

  private async executeStep(step: WorkflowStep, context: ExecutionContext): Promise<void> {
    switch (step.type) {
      case 'navigate':
        await this.executeNavigate(step as NavigateStep, context)
        break
      case 'click':
        await this.executeClick(step as ClickStep, context)
        break
      case 'input':
        await this.executeInput(step as InputStep, context)
        break
      case 'wait':
        await this.executeWait(step as any, context)
        break
      case 'extract':
        await this.executeExtract(step as ExtractStep, context)
        break
      case 'evaluate':
        await this.executeEvaluate(step as EvaluateStep, context)
        break
      default:
        throw new WorkflowError(`Unknown step type: ${(step as any).type}`)
    }
  }

  private async executeNavigate(step: NavigateStep, context: ExecutionContext): Promise<void> {
    try {
      logger.debug({ url: step.url }, 'Navigating to URL')
      await context.page.goto(step.url, {
        waitUntil: 'networkidle',
        timeout: 30000,
      })
      logger.debug({ url: step.url }, 'Navigation successful')
    } catch (err) {
      throw new BrowserError(`Failed to navigate to ${step.url}`, {
        url: step.url,
        originalError: (err as Error).message,
      })
    }
  }

  private async executeClick(step: ClickStep, context: ExecutionContext): Promise<void> {
    try {
      logger.debug({ selector: step.selector }, 'Clicking element')

      if (!await context.page.locator(step.selector).isVisible({ timeout: 5000 })) {
        throw new Error(`Element not visible: ${step.selector}`)
      }

      await context.page.click(step.selector, {
        timeout: 5000,
      })

      if (step.waitForNavigation) {
        await context.page.waitForLoadState('networkidle', { timeout: 30000 })
      } else if (step.delay) {
        await context.page.waitForTimeout(step.delay)
      }

      logger.debug({ selector: step.selector }, 'Click successful')
    } catch (err) {
      throw new BrowserError(`Failed to click element ${step.selector}`, {
        selector: step.selector,
        originalError: (err as Error).message,
      })
    }
  }

  private async executeInput(step: InputStep, context: ExecutionContext): Promise<void> {
    try {
      const value = String(context.variables[step.valueKey] || '')
      logger.debug({ selector: step.selector }, 'Filling input field')

      if (step.clearFirst) {
        await context.page.locator(step.selector).clear()
      }

      await context.page.fill(step.selector, value, { timeout: 5000 })

      if (step.delay) {
        await context.page.waitForTimeout(step.delay)
      }

      logger.debug({ selector: step.selector }, 'Input successful')
    } catch (err) {
      throw new BrowserError(`Failed to input to element ${step.selector}`, {
        selector: step.selector,
        originalError: (err as Error).message,
      })
    }
  }

  private async executeWait(step: any, context: ExecutionContext): Promise<void> {
    logger.debug({ ms: step.ms }, 'Waiting')
    await context.page.waitForTimeout(step.ms)
  }

  private async executeExtract(step: ExtractStep, context: ExecutionContext): Promise<void> {
    try {
      logger.debug({ selector: step.selector, key: step.key }, 'Extracting data')

      const locator = context.page.locator(step.selector)

      if (step.multiple) {
        const count = await locator.count()
        const elements = []

        for (let i = 0; i < count; i++) {
          const elementLocator = locator.nth(i)
          const data = await this.extractElementData(elementLocator, step.attribute)
          elements.push(data)
        }

        context.results[step.key] = elements
      } else {
        const data = await this.extractElementData(locator, step.attribute)
        context.results[step.key] = data
      }

      logger.debug(
        { selector: step.selector, key: step.key, extracted: context.results[step.key] },
        'Data extracted'
      )
    } catch (err) {
      logger.warn(
        { selector: step.selector, error: (err as Error).message },
        'Failed to extract data, continuing'
      )
      context.results[step.key] = null
    }
  }

  private async extractElementData(locator: any, attribute?: string): Promise<string | null> {
    switch (attribute) {
      case 'html':
        return await locator.innerHTML()
      case 'value':
        return await locator.inputValue()
      case 'href':
        return await locator.getAttribute('href')
      case 'text':
      default:
        return await locator.textContent()
    }
  }

  private async executeEvaluate(step: EvaluateStep, context: ExecutionContext): Promise<void> {
    try {
      logger.debug({ code: step.code }, 'Evaluating code')

      const result = await context.page.evaluate((code: string) => {
        return Function(code)()
      }, step.code)

      context.results[step.resultKey] = result
      logger.debug({ resultKey: step.resultKey }, 'Evaluation successful')
    } catch (err) {
      throw new WorkflowError(`Failed to evaluate code`, {
        code: step.code,
        originalError: (err as Error).message,
      })
    }
  }
}

export async function createExecutionEngine(page: Page): Promise<WorkflowExecutionEngine> {
  return new WorkflowExecutionEngine(page)
}
