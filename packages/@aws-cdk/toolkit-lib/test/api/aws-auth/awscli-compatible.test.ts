import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';
import { AwsCliCompatible } from '../../../lib/api/aws-auth/private';
import { TestIoHost } from '../../_helpers/test-io-host';

jest.mock('../../../lib/api/aws-auth/ec2-detection', () => ({
  isEc2Instance: jest.fn(),
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { isEc2Instance } = require('../../../lib/api/aws-auth/ec2-detection');

const ioHost = new TestIoHost();
const ioHelper = ioHost.asHelper('sdk');

describe('AwsCliCompatible.region', () => {
  beforeEach(() => {
    // make sure we don't mistakenly point to an unrelated file
    process.env.AWS_CONFIG_FILE = '/dev/null';
    process.env.AWS_SHARED_CREDENTIALS_FILE = '/dev/null';

    // these take precedence over the ini files so we need to disable them for
    // the test to invoke the right function
    delete process.env.AWS_REGION;
    delete process.env.AMAZON_REGION;
    delete process.env.AWS_DEFAULT_REGION;
    delete process.env.AMAZON_DEFAULT_REGION;
  });

  test('default region can be specified in config', async () => {
    const config = `
  [default]
  region=region-in-config
  `;

    await expect(region({ configFile: config })).resolves.toBe('region-in-config');
  });

  test('default region can be specified in credentials', async () => {
    const creds = `
  [default]
  region=region-in-credentials
  `;

    await expect(region({ credentialsFile: creds })).resolves.toBe('region-in-credentials');
  });

  test('profile region can be specified in config', async () => {
    const config = `
  [profile user1]
  region=region-in-config
  `;

    await expect(region({ configFile: config, profile: 'user1' })).resolves.toBe('region-in-config');
  });

  test('profile region can be specified in credentials', async () => {
    const creds = `
  [user1]
  region=region-in-credentials
  `;

    await expect(region({ credentialsFile: creds, profile: 'user1' })).resolves.toBe('region-in-credentials');
  });

  test('with profile | profile-region-in-credentials is priority 1', async () => {
    const config = `
  [default]
  region=default-region-in-config

  [profile user]
  region=profile-region-in-config

  `;

    const creds = `
  [default]
  region=default-region-in-credentials

  [user]
  region=profile-region-in-credentials
  `;

    await expect(region({ credentialsFile: creds, configFile: config, profile: 'user' })).resolves.toBe(
      'profile-region-in-credentials',
    );
  });

  test('with profile | profile-region-in-config is priority 2', async () => {
    const config = `
  [default]
  region=default-region-in-config

  [profile user]
  region=profile-region-in-config

  `;

    const creds = `
  [default]
  region=default-region-in-credentials

  [user]
  `;

    await expect(region({ credentialsFile: creds, configFile: config, profile: 'user' })).resolves.toBe(
      'profile-region-in-config',
    );
  });

  test('with profile | default-region-in-credentials is priority 3', async () => {
    const config = `
  [default]
  region=default-region-in-config

  [profile user]

  `;

    const creds = `
  [default]
  region=default-region-in-credentials

  [user]
  `;

    await expect(region({ credentialsFile: creds, configFile: config, profile: 'user' })).resolves.toBe(
      'default-region-in-credentials',
    );
  });

  test('with profile | default-region-in-config is priority 4', async () => {
    const config = `
  [default]
  region=default-region-in-config

  [profile user]

  `;

    const creds = `
  [default]

  [user]
  `;

    await expect(region({ credentialsFile: creds, configFile: config, profile: 'user' })).resolves.toBe(
      'default-region-in-config',
    );
  });

  test('with profile | us-east-1 is priority 5', async () => {
    const config = `
  [default]

  [profile user]

  `;

    const creds = `
  [default]

  [user]
  `;

    await expect(region({ credentialsFile: creds, configFile: config, profile: 'user' })).resolves.toBe('us-east-1');
  });

  test('without profile | default-region-in-credentials is priority 1', async () => {
    const config = `
  [default]
  region=default-region-in-config

  `;

    const creds = `
  [default]
  region=default-region-in-credentials

  `;

    await expect(region({ credentialsFile: creds, configFile: config })).resolves.toBe('default-region-in-credentials');
  });

  test('without profile | default-region-in-config is priority 2', async () => {
    const config = `
  [default]
  region=default-region-in-config

  `;

    const creds = `
  [default]

  `;

    await expect(region({ credentialsFile: creds, configFile: config })).resolves.toBe('default-region-in-config');
  });

  test('without profile | us-east-1 is priority 3', async () => {
    const config = `
  [default]

  `;

    const creds = `
  [default]

  `;

    await expect(region({ credentialsFile: creds, configFile: config })).resolves.toBe('us-east-1');
  });
});

async function region(opts: {
  readonly configFile?: string;
  readonly credentialsFile?: string;
  readonly profile?: string;
}) {
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'awscli-compatible.test'));

  try {
    if (opts.configFile) {
      const configPath = path.join(workdir, 'config');
      fs.writeFileSync(configPath, opts.configFile);
      process.env.AWS_CONFIG_FILE = configPath;
    }

    if (opts.credentialsFile) {
      const credentialsPath = path.join(workdir, 'credentials');
      fs.writeFileSync(credentialsPath, opts.credentialsFile);
      process.env.AWS_SHARED_CREDENTIALS_FILE = credentialsPath;
    }

    return await new AwsCliCompatible(ioHelper, {}).region(opts.profile);
  } finally {
    fs.removeSync(workdir);
  }
}

describe('Session token', () => {
  beforeEach(() => {
    process.env.AWS_ACCESS_KEY_ID = 'foo';
    process.env.AWS_SECRET_ACCESS_KEY = 'bar';
  });

  test('does not mess up with session token env variables if they are undefined', async () => {
    // Making sure these variables are not defined
    delete process.env.AWS_SESSION_TOKEN;
    delete process.env.AMAZON_SESSION_TOKEN;

    await new AwsCliCompatible(ioHelper, {}).credentialChainBuilder();

    expect(process.env.AWS_SESSION_TOKEN).toBeUndefined();
  });

  test('preserves AWS_SESSION_TOKEN if it is defined', async () => {
    process.env.AWS_SESSION_TOKEN = 'aaa';
    delete process.env.AMAZON_SESSION_TOKEN;

    await new AwsCliCompatible(ioHelper, {}).credentialChainBuilder();

    expect(process.env.AWS_SESSION_TOKEN).toEqual('aaa');
  });

  test('assigns AWS_SESSION_TOKEN if it is not defined but AMAZON_SESSION_TOKEN is', async () => {
    delete process.env.AWS_SESSION_TOKEN;
    process.env.AMAZON_SESSION_TOKEN = 'aaa';

    await new AwsCliCompatible(ioHelper, {}).credentialChainBuilder();

    expect(process.env.AWS_SESSION_TOKEN).toEqual('aaa');
  });

  test('preserves AWS_SESSION_TOKEN if both are defined', async () => {
    process.env.AWS_SESSION_TOKEN = 'aaa';
    process.env.AMAZON_SESSION_TOKEN = 'bbb';

    await new AwsCliCompatible(ioHelper, {}).credentialChainBuilder();

    expect(process.env.AWS_SESSION_TOKEN).toEqual('aaa');
  });
});

describe('IMDS auto-disable on non-EC2 environments', () => {
  const originalExecutionEnv = process.env.AWS_EXECUTION_ENV;
  const originalMetadataDisabled = process.env.AWS_EC2_METADATA_DISABLED;

  beforeEach(() => {
    // Pretend we're not on EC2 so the auto-disable code path is reachable.
    (isEc2Instance as jest.Mock).mockReturnValue(false);

    delete process.env.AWS_EC2_METADATA_DISABLED;
    delete process.env.AWS_EXECUTION_ENV;
  });

  afterEach(() => {
    if (originalExecutionEnv === undefined) {
      delete process.env.AWS_EXECUTION_ENV;
    } else {
      process.env.AWS_EXECUTION_ENV = originalExecutionEnv;
    }
    if (originalMetadataDisabled === undefined) {
      delete process.env.AWS_EC2_METADATA_DISABLED;
    } else {
      process.env.AWS_EC2_METADATA_DISABLED = originalMetadataDisabled;
    }
  });

  test('auto-disables IMDS on a developer workstation (AWS_EXECUTION_ENV unset)', async () => {
    await new AwsCliCompatible(ioHelper, {}).credentialChainBuilder();

    expect(process.env.AWS_EC2_METADATA_DISABLED).toEqual('true');
  });

  test('auto-disables IMDS when AWS_EXECUTION_ENV does not have the AWS_ prefix', async () => {
    process.env.AWS_EXECUTION_ENV = 'MyCustomEnv';

    await new AwsCliCompatible(ioHelper, {}).credentialChainBuilder();

    expect(process.env.AWS_EC2_METADATA_DISABLED).toEqual('true');
  });

  test('keeps IMDS enabled on Amazon Bedrock AgentCore Runtime', async () => {
    process.env.AWS_EXECUTION_ENV = 'AWS_BedrockAgentCore_Runtime';

    await new AwsCliCompatible(ioHelper, {}).credentialChainBuilder();

    expect(process.env.AWS_EC2_METADATA_DISABLED).toBeUndefined();
  });

  test('keeps IMDS enabled on AWS Lambda (AWS_Lambda_* marker)', async () => {
    process.env.AWS_EXECUTION_ENV = 'AWS_Lambda_nodejs20.x';

    await new AwsCliCompatible(ioHelper, {}).credentialChainBuilder();

    expect(process.env.AWS_EC2_METADATA_DISABLED).toBeUndefined();
  });

  test('does not override an explicit AWS_EC2_METADATA_DISABLED value', async () => {
    process.env.AWS_EC2_METADATA_DISABLED = 'false';

    await new AwsCliCompatible(ioHelper, {}).credentialChainBuilder();

    expect(process.env.AWS_EC2_METADATA_DISABLED).toEqual('false');
  });
});
