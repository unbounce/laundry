import { lint } from '../../index';

describe('IAMPolicyDocumentValidator', () => {
  test.each([
    [{ Bool: { 'aws:SecureTransport': true } }],
    [{ StringEquals: { 'aws:RequestTag/foo': ['bar'] } }],
  ])('valid %s', (condition) => {
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
                    Condition: condition
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
                    Action: '',
                    Effect: 'Deny',
                    Principal: [''],
                    Resource: [''],
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

  test('invalid conditional', () => {
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
                    Action: '',
                    Effect: 'Allow',
                    Resource: '',
                    Condition: { Foo: { 'aws:SecureTransport': true } }
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

  test('invalid condition key', () => {
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
                    Action: '',
                    Effect: 'Allow',
                    Resource: '',
                    Condition: { Bool: { 'cats': 'dogs' } }
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
                    Action: '',
                    Effect: 'foo',
                    Resource: '',
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
