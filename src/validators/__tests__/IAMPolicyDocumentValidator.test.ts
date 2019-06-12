import { lint } from '../../index';

describe('IAMPolicyDocumentValidator', () => {
  test('valid', () => {
    const template = JSON.stringify({
      Resources: {
        Role: {
          Type: 'AWS::IAM::Role',
          Properties: {
            AssumeRolePolicyDocument: {},
            Policies: [{
              PolicyName: '',
              PolicyDocument: {
                Version: '',
                Statement: [
                  {
                    Sid: '',
                    Action: '',
                    Effect: 'Allow',
                    Principal: '',
                    Resource: '',
                    Condition: {}
                  }
                ]
              }
            }]
          }
        }
      }
    });
    expect(lint(template)).toEqual([]);
  });

  test('valid, with lists', () => {
    const template = JSON.stringify({
      Resources: {
        Role: {
          Type: 'AWS::IAM::Role',
          Properties: {
            AssumeRolePolicyDocument: {},
            Policies: [{
              PolicyName: '',
              PolicyDocument: {
                Version: '',
                Statement: [
                  {
                    Sid: '',
                    Action: '',
                    Effect: 'Deny',
                    Resource: [''],
                    Condition: {}
                  }
                ]
              }
            }]
          }
        }
      }
    });
    expect(lint(template)).toEqual([]);
  });

  test('missing required properties', () => {
    const template = JSON.stringify({
      Resources: {
        Role: {
          Type: 'AWS::IAM::Role',
          Properties: {
            AssumeRolePolicyDocument: {},
            Policies: [{
              PolicyName: '',
              PolicyDocument: {
                Version: '',
                Statement: [
                  {}
                ]
              }
            }]
          }
        }
      }
    });
    expect(lint(template)).toMatchSnapshot();
  });

  test('invalid types', () => {
    const template = JSON.stringify({
      Resources: {
        Role: {
          Type: 'AWS::IAM::Role',
          Properties: {
            AssumeRolePolicyDocument: {},
            Policies: [{
              PolicyName: '',
              PolicyDocument: {
                Version: '',
                Statement: [
                  {
                    Sid: [],
                    Action: [],
                    Effect: [],
                    Principal: {},
                    Resource: {},
                    Condition: '',
                  }
                ]
              }
            }]
          }
        }
      }
    });
    expect(lint(template)).toMatchSnapshot();
  });

  test('invalid effect', () => {
    const template = JSON.stringify({
      Resources: {
        Role: {
          Type: 'AWS::IAM::Role',
          Properties: {
            AssumeRolePolicyDocument: {},
            Policies: [{
              PolicyName: '',
              PolicyDocument: {
                Version: '',
                Statement: [
                  {
                    Sid: '',
                    Action: '',
                    Effect: 'foo',
                    Principal: '',
                    Resource: '',
                    Condition: {}
                  }
                ]
              }
            }]
          }
        }
      }
    });
    expect(lint(template)).toMatchSnapshot();
  });

  test('valid, statement single value', () => {
    const template = JSON.stringify({
      Resources: {
        Role: {
          Type: 'AWS::IAM::Role',
          Properties: {
            AssumeRolePolicyDocument: {},
            Policies: [{
              PolicyName: '',
              PolicyDocument: {
                Version: '',
                Statement: {
                  Sid: '',
                  Action: '',
                  Effect: 'Allow',
                  Principal: '',
                  Resource: '',
                  Condition: {}
                }
              }
            }]
          }
        }
      }
    });
    expect(lint(template)).toEqual([]);
  });

  test('invalid, statement single value', () => {
    const template = JSON.stringify({
      Resources: {
        Role: {
          Type: 'AWS::IAM::Role',
          Properties: {
            AssumeRolePolicyDocument: {},
            Policies: [{
              PolicyName: '',
              PolicyDocument: {
                Version: '',
                Statement: {
                  Sid: '',
                  Action: '',
                  Effect: [],
                  Principal: '',
                  Resource: '',
                  Condition: {}
                }
              }
            }]
          }
        }
      }
    });
    expect(lint(template)).toMatchSnapshot();
  });

  test.each([
    "*",
    { AWS: '*' },
    { AWS: 'arn:aws:iam::123456789012:root' },
    { AWS: ['123456789012', 'arn:aws:iam::123456789012:root'] },
    { AWS: 'arn:aws:iam::123456789012:user/user-name' },
    { Federated: 'www.amazon.com' },
    { Service: "elasticmapreduce.amazonaws.com" },
    { Service: ["elasticmapreduce.amazonaws.com", "datapipeline.amazonaws.com"] },
  ])('valid principal: %j', (principal) => {
    const template = JSON.stringify({
      Resources: {
        Role: {
          Type: 'AWS::SQS::QueuePolicy',
          Properties: {
            Queues: [''],
            PolicyDocument: {
              Statement: [
                {
                  Effect: 'Allow',
                  Principal: principal,
                  Action: 'SQS:SendMessage',
                  Resource: ''
                }
              ]
            }
          }
        }
      }
    });
    expect(lint(template)).toEqual([]);
  });

  test.each([
    {},
    { AWS: {} },
    { AWS: [{}] },
    { Federated: [] },
    { Federated: [{}] },
    { Service: {} },
    { Service: [{}] },
  ])('invalid principal: %j', (principal) => {
    const template = JSON.stringify({
      Resources: {
        Role: {
          Type: 'AWS::SQS::QueuePolicy',
          Properties: {
            Queues: [''],
            PolicyDocument: {
              Statement: [
                {
                  Effect: 'Allow',
                  Principal: principal,
                  Action: 'SQS:SendMessage',
                  Resource: ''
                }
              ]
            }
          }
        }
      }
    });
    expect(lint(template)).toMatchSnapshot();
  });
});
