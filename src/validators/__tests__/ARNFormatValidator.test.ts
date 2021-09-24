import { lint } from '../../index';

describe('ARNFormatValidator', () => {
  test('valid', () => {
    const template = JSON.stringify({
      Resources: {
        Role: {
          Type: 'AWS::S3::Bucket',
          Properties: {
            BucketName: 'arn:aws:s3:::bar'
          }
        }
      }
    });
    expect(lint(template)).toEqual([]);
  });

  test('valid Ref', () => {
    const template = JSON.stringify({
      Parameters: {
        A: {
          Type: 'String',
          Default: 'arn:aws:s3:::bar'
        }
      },
      Resources: {
        Role: {
          Type: 'AWS::S3::Bucket',
          Properties: {
            BucketName: {
              Ref: 'A'
            }
          }
        }
      }
    });
    expect(lint(template)).toEqual([]);
  });

  test('invalid', () => {
    const template = JSON.stringify({
      Resources: {
        Role: {
          Type: 'AWS::S3::Bucket',
          Properties: {
            BucketName: 'arn:aws:s4:*:*:bar'
          }
        }
      }
    });
    expect(lint(template)).toMatchSnapshot();
  });

  test('invalid Ref', () => {
    const template = JSON.stringify({
      Parameters: {
        A: {
          Type: 'String',
          Default: 'arn:aws:s4:::bar'
        }
      },
      Resources: {
        Role: {
          Type: 'AWS::S3::Bucket',
          Properties: {
            BucketName: {
              Ref: 'A'
            }
          }
        }
      }
    });
    expect(lint(template)).toMatchSnapshot();
  });

});
