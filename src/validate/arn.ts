import * as _ from 'lodash';

import { Path, ErrorFn } from '../types';
import { withSuggestion } from '../util';

const services = [
  'a4b',
  'apigateway',
  'application-autoscaling',
  'discovery',
  'appstream',
  'appsync',
  'artifact',
  'athena',
  'autoscaling-plans',
  'batch',
  'aws-portal',
  'budgets',
  'acm',
  'acm-pca',
  'chime',
  'cloud9',
  'clouddirectory',
  'cloudformation',
  'cloudfront',
  'cloudhsm',
  'servicediscovery',
  'cloudsearch',
  'cloudtrail',
  'cloudwatch',
  'events',
  'logs',
  'codebuild',
  'codecommit',
  'codedeploy',
  'codepipeline',
  'signer',
  'codestar',
  'cognito-idp',
  'cognito-identity',
  'cognito-sync',
  'comprehend',
  'config',
  'connect',
  'cur',
  'ce',
  'datapipeline',
  'dms',
  'devicefarm',
  'directconnect',
  'ds',
  'dynamodb',
  'dax',
  'autoscaling',
  'ec2',
  'ecr',
  'ecs',
  'eks',
  'elasticbeanstalk',
  'elasticfilesystem',
  'elasticloadbalancing',
  'elasticmapreduce',
  'elastictranscoder',
  'elasticache',
  'es',
  'fms',
  'freertos',
  'gamelift',
  'glacier',
  'globalaccelerator',
  'glue',
  'greengrass',
  'guardduty',
  'health',
  'iam',
  'importexport',
  'inspector',
  'iot',
  'iotanalytics',
  'iot1click',
  'kms',
  'kinesisanalytics',
  'firehose',
  'kinesis',
  'kinesisvideo',
  'lambda',
  'lex',
  'lightsail',
  'macie',
  'machinelearning',
  'aws-marketplace',
  'aws-marketplace-management',
  'mechanicalturk',
  'crowd',
  'mediaconnect',
  'mediaconvert',
  'medialive',
  'mediapackage',
  'mediastore',
  'mediatailor',
  'ec2message',
  'mgh',
  'mobileanalytics',
  'mobilehub',
  'mq',
  'opsworks',
  'opsworks-cm',
  'organizations',
  'personalize',
  'mobiletargeting',
  'polly',
  'pricing',
  'quicksight',
  'redshift',
  'rekognition',
  'rds',
  'resource-groups',
  'tag',
  'route53',
  'route53domains',
  'route53resolver',
  'sagemaker',
  'secretsmanager',
  'sts',
  'serverlessrepo',
  'servicecatalog',
  'shield',
  'shield',
  'transfer',
  'ses',
  'sns',
  'sqs',
  's3',
  'swf',
  'sdb',
  'sso',
  'snowball',
  'states',
  'storagegateway',
  'sumerian',
  'support',
  'ssm',
  'textract',
  'transcribe',
  'translate',
  'trustedadvisor',
  'ec2',
  'waf',
  'waf-regional',
  'workdocs',
  'worklink',
  'workmail',
  'workspaces',
  'wam',
  'xray',
];

// Services for which ARNs do not contain a region
const noRegionServices = [
  'artifact',
  'cloudfront',
  'globalaccelerator',
  'iam',
  'organizations',
  'route53',
  's3',
  'waf',
  'worklink',
];

// Services for which ARNs do not contain an account
const noAccountServices = [
  'artifact',
  's3',
  // arn:aws:route53::account-id:domain does require account
  'route53',
]

// https://docs.aws.amazon.com/general/latest/gr/aws-arns-and-namespaces.html
const arn = (path: Path, value: any, addError: ErrorFn): boolean => {
  let valid = true;
  if (_.isString(value)) {
    if((value.match(/:/g) || []).length === 5) {
      // arn:partition:service:region:account-id:resource
      const [
        prefix,
        partition,
        service,
        region,
        account,
        ...resourceParts
      ] = value.split(':');
      const resource = resourceParts.join(':');

      if (prefix !== 'arn') {
        addError(path, `ARN must start with 'arn', got ${prefix}`);
        valid = false;
      }

      if (!/^aws(-[a-z]+)?$/.test(partition)) {
        addError(path, `ARN must start with 'arn:aws' or 'arn:aws-cn', got ${partition}`);
        valid = false;
      }

      if (!_.includes(services, service)) {
        const message = withSuggestion(
          `ARN service must one of ${services.join(', ')}, got ${service}`,
          services,
          service
        );
        addError(path, message);
        valid = false;
      }

      if (_.includes(noRegionServices, service)) {
        if (_.some(region)) {
          addError(path, `region should not be provided for ${service} ARNs`);
          valid = false;
        }
      } else if (_.isEmpty(region)) {
        addError(path, 'region must be provided in ARN');
        valid = false;
      }

      if (_.includes(noAccountServices, service)) {
        if (_.some(account)) {
          if (service === 'route53' && _.startsWith(resource, 'domain')) {
            // Special case for route53 domain
          } else {
            addError(path, `account should not be provided for ${service} ARNs`);
            valid = false;
          }
        }
      } else if (_.isEmpty(account)) {
        addError(path, 'account must be provided in ARN');
        valid = false;
      }
    } else {
      const message = 'ARN must be in the format: arn:partition:service:region:account-id:resource';
      addError(path, message);
      valid = false;
    }
  }
  return valid;
}

export default arn;
