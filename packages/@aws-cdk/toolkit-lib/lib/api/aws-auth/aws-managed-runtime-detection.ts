/**
 * Detect whether we are running inside an AWS-managed runtime (Lambda,
 * Bedrock AgentCore, CodeBuild, ECS, …) that publishes itself through the
 * `AWS_EXECUTION_ENV` environment variable.
 *
 * AWS-managed runtimes consistently set `AWS_EXECUTION_ENV` to a value with
 * an `AWS_` prefix, e.g.:
 *
 * - `AWS_Lambda_nodejs20.x` — documented by AWS Lambda as "the runtime
 *   identifier, prefixed by `AWS_Lambda_`".
 *   See https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html#configuration-envvars-runtime
 * - `AWS_BedrockAgentCore_Runtime` — observed on Amazon Bedrock AgentCore
 *   Runtime, which delivers task-role credentials exclusively through IMDS.
 * - `AWS_CodeBuild`, `AWS_ECS_*`, … — same convention.
 *
 * This is used alongside `isEc2Instance()` to decide whether to auto-disable
 * IMDS on environments that look "not EC2" by `/sys`-based detection. Keeping
 * IMDS enabled is essential on runtimes whose only credential channel is
 * IMDS (e.g. Bedrock AgentCore, whose microVM isolation hides the DMI /
 * hypervisor files that `isEc2Instance()` probes).
 *
 * On a developer workstation `AWS_EXECUTION_ENV` is unset, so this returns
 * `false` and the auto-disable optimization still applies.
 */
export function isAwsManagedRuntime(): boolean {
  return process.env.AWS_EXECUTION_ENV?.startsWith('AWS_') ?? false;
}
