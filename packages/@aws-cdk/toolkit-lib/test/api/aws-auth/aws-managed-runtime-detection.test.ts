import { isAwsManagedRuntime } from '../../../lib/api/aws-auth/aws-managed-runtime-detection';

describe('isAwsManagedRuntime', () => {
  const originalExecutionEnv = process.env.AWS_EXECUTION_ENV;

  afterEach(() => {
    if (originalExecutionEnv === undefined) {
      delete process.env.AWS_EXECUTION_ENV;
    } else {
      process.env.AWS_EXECUTION_ENV = originalExecutionEnv;
    }
  });

  test('returns false when AWS_EXECUTION_ENV is unset', () => {
    delete process.env.AWS_EXECUTION_ENV;
    expect(isAwsManagedRuntime()).toBe(false);
  });

  test('returns false when AWS_EXECUTION_ENV is an empty string', () => {
    process.env.AWS_EXECUTION_ENV = '';
    expect(isAwsManagedRuntime()).toBe(false);
  });

  test('returns false for a value without the AWS_ prefix', () => {
    process.env.AWS_EXECUTION_ENV = 'MyCustomEnv';
    expect(isAwsManagedRuntime()).toBe(false);
  });

  test('returns true for AWS Lambda marker (AWS_Lambda_*)', () => {
    process.env.AWS_EXECUTION_ENV = 'AWS_Lambda_nodejs20.x';
    expect(isAwsManagedRuntime()).toBe(true);
  });

  test('returns true for Amazon Bedrock AgentCore Runtime marker', () => {
    process.env.AWS_EXECUTION_ENV = 'AWS_BedrockAgentCore_Runtime';
    expect(isAwsManagedRuntime()).toBe(true);
  });

  test('returns true for AWS CodeBuild marker', () => {
    process.env.AWS_EXECUTION_ENV = 'AWS_CodeBuild';
    expect(isAwsManagedRuntime()).toBe(true);
  });

  test('is case-sensitive: lowercase aws_ prefix is not matched', () => {
    process.env.AWS_EXECUTION_ENV = 'aws_something';
    expect(isAwsManagedRuntime()).toBe(false);
  });
});
