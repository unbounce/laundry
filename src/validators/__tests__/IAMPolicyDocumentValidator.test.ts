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
                    Effect: '',
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
                    Effect: '',
                    Principal: [''],
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
});
