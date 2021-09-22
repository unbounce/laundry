import * as _ from 'lodash';

import { lint, ignoredErrorMatcher } from '../index';
import * as yaml from '../yaml';

const Styles: yaml.Style[] = ['Object', 'YAMLTag'];

const testTemplate = {
  Conditions: { C: true },
  Resources: {
    A: {
      Type: 'AWS::S3::Bucket',
      Properties: {}
    },
    B: {
      Type: 'AWS::S3::Bucket',
      Properties: {}
    },
    Bucket: {
      Type: 'AWS::S3::Bucket',
      Properties: {}
    }
  }
}

function set(key: string | string[], value: any, o: object) {
  return _.set(_.cloneDeep(o), key, value);
}
function lintWithProperty(key: string, value: any) {
  const template = set(key, value, testTemplate);
  return lint(yaml.dump(template))
}

function t(value: any) {
  return yaml.dump(set(
    ['Resources', 'Bucket', 'Properties', 'BucketName'],
    value,
    testTemplate
  ));
}

describe('lint', () => {

  test('valid template', () => {
    const template = JSON.stringify({
      Resources: {
        Bucket: {
          Type: 'AWS::S3::Bucket',
          Properties: {}
        }
      }
    });
    expect(lint(template)).toEqual([]);
  });

  test('empty template', () => {
    const expected = {
      path: ['Root'],
      message: expect.stringMatching(/Object/)
    };
    expect(lint('')[0]).toMatchObject(expected);
  });

  describe('Description', () => {
    test('invalid string', () => {
      const template = yaml.dump({
        Description: 'test',
        Resources: {}
      });
      expect(lint(template)).toEqual([]);
    });

    test('non-string', () => {
      const expected = [{
        path: ['Root', 'Description'],
        message: expect.stringMatching(/String/)
      }];
      const template = yaml.dump({
        Description: {},
        Resources: {}
      });
      expect(lint(template)).toMatchObject(expected);
    });
  });

  describe('AWSTemplateFormatVersion', () => {
    test('valid string', () => {
      const template = yaml.dump({
        AWSTemplateFormatVersion: '2010-09-09',
        Resources: {}
      });
      expect(lint(template)).toEqual([]);
    });

    test('valid string', () => {
      const expected = [{
        path: ['Root', 'AWSTemplateFormatVersion'],
        message: expect.stringMatching(/format/)
      }];
      const template = yaml.dump({
        AWSTemplateFormatVersion: 'test',
        Resources: {}
      });
      expect(lint(template)).toMatchObject(expected);
    });

    test('non-string', () => {
      const expected = [{
        path: ['Root', 'AWSTemplateFormatVersion'],
        message: expect.stringMatching(/String/)
      }];
      const template = yaml.dump({
        AWSTemplateFormatVersion: {},
        Resources: {}
      });
      expect(lint(template)).toMatchObject(expected);
    });
  });

  describe('Resources', () => {
    test('missing Resources', () => {
      const expected = [{
        path: ['Root', 'Resources'],
        message: expect.stringMatching(/required/)
      }];
      expect(lint('{}')).toMatchObject(expected);
    });

    test('required property', () => {
      const expected = [{
        path: ['Root', 'Resources', 'RecordSet', 'Properties', 'Name'],
        message: expect.stringMatching(/required/)
      }];
      const template = yaml.dump({
        Resources: { RecordSet: { Type: 'AWS::Route53::RecordSet', Properties: { Type: 'A', TTL: 1 } } }
      });
      expect(lint(template)).toMatchObject(expected);
    });

    test('required property AWS::NoValue', () => {
      const expected = [{
        path: ['Root', 'Resources', 'RecordSet', 'Properties', 'Name'],
        message: expect.stringMatching(/required/)
      }];
      const template = yaml.dump({
        Resources: {
          RecordSet: {
            Type: 'AWS::Route53::RecordSet',
            Properties: { Type: 'A', TTL: 1, Name: new yaml.Ref('AWS::NoValue', 'YAMLTag') }
          }
        }
      });
      expect(lint(template)).toMatchObject(expected);
    });

    test('invalid Type', () => {
      const expected = [
        {
          path: ['Root', 'Resources', 'FooBar', 'Type'],
          message: expect.stringMatching(/invalid/)
        }
      ];
      const template = yaml.dump({
        Resources: {
          FooBar: {
            Type: 'AWS::Foo::Bar',
            Properties: {}
          }
        }
      });
      expect(lint(template)).toMatchObject(expected);
    });

    test('invalid resource property primitive type', () => {
      const expected = [
        {
          path: ['Root', 'Resources', 'Bucket', 'Properties', 'BucketName'],
          message: expect.stringMatching(/String/)
        }
      ];
      const template = yaml.dump({
        Resources: {
          Bucket: {
            Type: 'AWS::S3::Bucket',
            Properties: {
              BucketName: {}
            }
          }
        }
      });
      expect(lint(template)).toMatchObject(expected);
    });

    test('invalid resource property type', () => {
      const expected = [
        {
          path: ['Root', 'Resources', 'Bucket', 'Properties', 'Tags'],
          message: expect.stringMatching(/List/)
        }
      ];
      const template = yaml.dump({
        Resources: {
          Bucket: {
            Type: 'AWS::S3::Bucket',
            Properties: {
              Tags: {}
            }
          }
        }
      });
      expect(lint(template)).toMatchObject(expected);
    });

    test('invalid resource property List type', () => {
      const expected = [
        {
          path: ['Root', 'Resources', 'Bucket', 'Properties', 'Tags', '0'],
          message: expect.stringMatching(/Object/)
        }
      ];
      const template = yaml.dump({
        Resources: {
          Bucket: {
            Type: 'AWS::S3::Bucket',
            Properties: {
              Tags: ['foo']
            }
          }
        }
      });
      expect(lint(template)).toMatchObject(expected);
    });

    describe('Condition', () => {
      test('valid condition', () => {
        const template = yaml.dump({
          Conditions: { C: true },
          Resources: { Bucket: { Condition: 'C', Type: 'AWS::S3::Bucket' } }
        });
        expect(lint(template)).toEqual([]);
      });
      test('invalid condition', () => {
        const expected = [{
          path: ['Root', 'Resources', 'Bucket', 'Condition'],
          message: expect.stringMatching(/Butter.*did you mean Batter/)
        }];
        const template = yaml.dump({
          Conditions: { Batter: true },
          Resources: { Bucket: { Condition: 'Butter', Type: 'AWS::S3::Bucket' } }
        });
        expect(lint(template)).toMatchObject(expected);
      });
    });

    describe('Sub', () => {
      describe.each(Styles)('%s', (style) => {
        test.each([
          // !Sub String
          ['valid resource', new yaml.Sub('${A}', style)],
          ['multiple resources', new yaml.Sub('a${A}b${B}c', style)],
          ['! is ignored', new yaml.Sub('${!Bar}', style)],
          ['valid attribute', new yaml.Sub('${A.Arn}', style)],

          // !Sub [String, Object]
          ['valid resource', new yaml.Sub(['${A}', {}], style)],
          ['local ref', new yaml.Sub(['${Local}', { Local: 'a' }], style)],
        ])('%s %j', (_s, bucketName) => {
          expect(lint(t(bucketName))).toEqual([]);
        });
        test.each([
          // !Sub String
          ['invalid resource', new yaml.Sub('${Blag}', style)],
          ['multiple with invalid resource', new yaml.Sub('a${Bar}b${B}', style)],

          // !Sub [String, Object]
          ['invalid attribute', new yaml.Sub('${A.Bar}', style)],

          ['invalid type', new yaml.Sub(['${A}'], style)],
          ['invalid type', new yaml.Sub([{}, '${A}'], style)],
          ['invalid type', new yaml.Sub({}, style)],
        ])('%s %j', (s, bucketName) => {
          expect(lint(t(bucketName))).toMatchSnapshot()
        });
      });
    });

    describe('GetAtt', () => {
      test.each([
        // !GetAtt String
        ['valid resource YAMLTag', new yaml.GetAtt('A.Arn', 'YAMLTag')],
        // !GetAtt [String, String]
        ['valid resource Object', new yaml.GetAtt(['A', 'Arn'], 'Object')],
        ['valid resource YAMLTag', new yaml.GetAtt(['A', 'Arn'], 'YAMLTag')],
      ])('%s %j', (s, bucketName) => {
        expect(lint(t(bucketName))).toEqual([]);
      });
      test.each([
        // !GetAtt String
        ['invalid resource YAMLTag', new yaml.GetAtt('Blag.Arn', 'YAMLTag')],
        ['invalid attribute YAMLTag', new yaml.GetAtt('A.Bar', 'YAMLTag')],

        // !GetAtt [String, String]
        ['invalid resource Object', new yaml.GetAtt(['A', 'Cat'], 'Object')],
        ['invalid resource YAMLTag', new yaml.GetAtt(['A', 'Cat'], 'YAMLTag')],

        ['invalid type', new yaml.GetAtt(['${A}'], 'Object')],
        ['invalid type', new yaml.GetAtt([{}, '${A}'], 'Object')],
        ['invalid type', new yaml.GetAtt({}, 'Object')],
        ['invalid type', new yaml.GetAtt({}, 'YAMLTag')],
      ])('%s %j', (s, bucketName) => {
        expect(lint(t(bucketName))).toMatchSnapshot();
      });

      describe('CloudFormation Stack Outputs', () => {
        describe.each(Styles)('%s', (style) => {
          test('Outputs', () => {
            const template = yaml.dump({
              Resources: {
                Stack: {
                  Type: 'AWS::CloudFormation::Stack',
                  Properties: { TemplateURL: '' }
                }
              },
              Outputs: {
                O: {
                  Value: new yaml.GetAtt('Stack.Outputs', style)
                },
                A: {
                  Value: new yaml.GetAtt('Stack.Outputs.A', style)
                }
              }
            });
            expect(lint(template)).toEqual([]);
          });
        });
      });
    });

    describe('Ref', () => {
      describe.each(Styles)('%s', (style) => {
        test.each([
          ['valid resource', new yaml.Ref('A', style)],
        ])('%s %j', (s, bucketName) => {
          expect(lint(t(bucketName))).toEqual([]);
        });
        test.each([
          ['invalid resource', new yaml.Ref('Blag', style)],
          ['invalid type', new yaml.Ref(['A'], style)],
          // ['invalid type', new yaml.Ref({ a: 'A' }, style), [e('String', ['Ref'])]],
        ])('%s %j', (s, bucketName) => {
          expect(lint(t(bucketName))).toMatchSnapshot();
        });
      });

      test('Non string type', () => {
        const template = yaml.dump({
          Parameters: { ExpirationInDays: { Type: 'Number' } },
          Resources: {
            A: {
              Type: 'AWS::S3::Bucket',
              Properties: {
                LifecycleConfiguration: {
                  Rules: [{
                    Status: 'Enabled',
                    ExpirationInDays: new yaml.Ref('ExpirationInDays', 'Object')
                  }]
                }
              }
            }
          }
        });
        expect(lint(template)).toEqual([]);
      });

    });

    describe('Base64', () => {
      describe.each(Styles)('%s', (style) => {
        test.each([
          ['string', new yaml.Base64('abc', style)],
          ['Ref', new yaml.Base64(new yaml.Ref('A', style), style)],
        ])('%s %j', (s, bucketName) => {
          expect(lint(t(bucketName))).toEqual([]);
        });
        test.each([
          // ['Sub', new yaml.Base64(new yaml.Sub('${A}', style), style), []],
          ['Ref with invalid resource', new yaml.Base64(new yaml.Ref('Nothing', style), style)],
        ])('%s %j', (s, bucketName) => {
          expect(lint(t(bucketName))).toMatchSnapshot();
        });
      });
    });

    describe('Join', () => {
      describe.each(Styles)('%s', (style) => {
        test.each([
          ['', new yaml.Join([',', ['a']], style)],
          ['Split', new yaml.Join([',', new yaml.Split([',', 'a'], style)], style)],
        ])('%s %j', (s, bucketName) => {
          expect(lint(t(bucketName))).toEqual([]);
        });
        test.each([
          ['invalid type', new yaml.Join('', style)],
          ['invalid type', new yaml.Join([[], ''], style)],
          ['missing input', new yaml.Join([''], style)],
          ['extra input', new yaml.Join(['', '', ''], style)],
        ])('%s %j', (s, bucketName) => {
          expect(lint(t(bucketName))).toMatchSnapshot();
        });
      });
    });

    describe('DependsOn', () => {
      test('valid resource', () => {
        expect(lintWithProperty('Resources.A.DependsOn', 'B')).toEqual([]);
      });
      test('invalid resource', () => {
        expect(lintWithProperty('Resources.A.DependsOn', 'Foo')).toMatchSnapshot();
      });
    });

    describe('only one', () => {
      test('valid', () => {
        const template = yaml.dump({
          Resources: {
            Bucket: {
              Type: 'AWS::S3::Bucket',
              Properties: {
                WebsiteConfiguration: {
                  RoutingRules: [{
                    RoutingRuleCondition: {
                      HttpErrorCodeReturnedEquals: ''
                    }
                  }]
                }
              }
            }
          }
        });
        expect(lint(template)).toEqual([]);
      });
      test('invalid', () => {
        const template = yaml.dump({
          Resources: {
            Bucket: {
              Type: 'AWS::S3::Bucket',
              Properties: {
                WebsiteConfiguration: {
                  RoutingRules: [{
                    RoutingRuleCondition: {
                      HttpErrorCodeReturnedEquals: '',
                      KeyPrefixEquals: ''
                    }
                  }]
                }
              }
            }
          }
        });
        expect(lint(template)).toMatchSnapshot();
      });
    });

    describe('at least one of', () => {
      test('valid', () => {
        const template = yaml.dump({
          Resources: {
            NACL: {
              Type: 'AWS::EC2::NetworkAclEntry',
              Properties: {
                NetworkAclId: 'abc-122',
                Protocol: '-1',
                RuleAction: 'allow',
                RuleNumber: 100,
                CidrBlock: ''
              }
            }
          }
        });
        expect(lint(template)).toEqual([]);
      });
      test('missing', () => {
        const template = yaml.dump({
          Resources: {
            NACL: {
              Type: 'AWS::EC2::NetworkAclEntry',
              Properties: {
                NetworkAclId: 'abc-122',
                Protocol: '-1',
                RuleAction: 'allow',
                RuleNumber: 100,
              }
            }
          }
        });
        expect(lint(template)).toMatchSnapshot();
      });
      test('missing for property', () => {
        const template = yaml.dump({
          Resources: {
            TaskDef: {
              Type: 'AWS::ECS::TaskDefinition',
              Properties: {
                ContainerDefinitions: [
                  {}
                ]
              }
            }
          }
        });
        expect(lint(template)).toMatchSnapshot();
      });
    });

    describe('inclusive', () => {
      test('valid', () => {
        const template = yaml.dump({
          Resources: {
            NACL: {
              Type: 'AWS::RDS::DBCluster',
              Properties: {
                Engine: '',
                MasterUsername: '',
                MasterUserPassword: ''
              }
            }
          }
        });
        expect(lint(template)).toEqual([]);
      });
      test('missing', () => {
        const template = yaml.dump({
          Resources: {
            NACL: {
              Type: 'AWS::RDS::DBCluster',
              Properties: {
                Engine: '',
                MasterUsername: ''
              }
            }
          }
        });
        expect(lint(template)).toMatchSnapshot();
      });
    });

    describe('exclusive', () => {
      describe('resource type', () => {
        test('valid', () => {
          const template = yaml.dump({
            Resources: {
              SGIngress: {
                Type: 'AWS::EC2::SecurityGroupIngress',
                Properties: {
                  FromPort: 0,
                  ToPort: 0,
                  IpProtocol: '',
                  CidrIp: ''
                }
              }
            }
          });
          expect(lint(template)).toEqual([]);
        });
        test('with exclusive properties', () => {
          const template = yaml.dump({
            Resources: {
              SGIngress: {
                Type: 'AWS::EC2::SecurityGroupIngress',
                Properties: {
                  FromPort: 0,
                  ToPort: 0,
                  IpProtocol: '',
                  CidrIp: '',
                  CidrIpv6: ''
                }
              }
            }
          });
          expect(lint(template)).toMatchSnapshot();
        });
      })
      describe('property type', () => {
        test('valid', () => {
          const template = yaml.dump({
            Resources: {
              SecurityGroup: {
                Type: 'AWS::EC2::SecurityGroup',
                Properties: {
                  GroupDescription: '',
                  VpcId: '',
                  SecurityGroupIngress: [{
                    FromPort: 0,
                    ToPort: 0,
                    IpProtocol: '',
                    CidrIp: ''
                  }]
                }
              }
            }
          });
          expect(lint(template)).toEqual([]);
        });
        test('with exclusive properties', () => {
          const template = yaml.dump({
            Resources: {
              Record: {
                Type: 'AWS::Route53::RecordSet',
                Properties: {
                  Type: '',
                  Name: '',
                  AliasTarget: {},
                  TTL: 1
                }
              }
            }
          });
          expect(lint(template)).toMatchSnapshot();
        });
      })
    });
  });

  describe('Split', () => {
    describe.each(Styles)('%s', (style) => {
      test.each([
        ['', new yaml.Split([',', 'a'], style)],
        ['Join', new yaml.Split([',', new yaml.Join([',', ['a']], style)], style)],
      ])('%s %j', (s, san) => {
        const template = yaml.dump({
          Resources: {
            Certificate: {
              Type: 'AWS::CertificateManager::Certificate',
              Properties: {
                DomainName: 'example.com',
                SubjectAlternativeNames: san
              }
            }
          }
        });
        expect(lint(template)).toEqual([]);
      });
      test.each([
        ['invalid type', new yaml.Split('', style)],
        ['invalid type', new yaml.Split([[], ''], style)],
        ['missing input', new yaml.Split([''], style)],
        ['extra input', new yaml.Split(['', [''], ''], style)],
      ])('%s %j', (s, san) => {
        const template = yaml.dump({
          Resources: {
            Certificate: {
              DomainName: 'example.com',
              SubjectAlternativeNames: san
            }
          }
        });
        expect(lint(template)).toMatchSnapshot();
      });
    });
  });

  describe('GetAZs', () => {
    describe.each(Styles)('%s', (style) => {
      test.each([
        ['', new yaml.GetAZs('', style)],
        ['Ref', new yaml.GetAZs(new yaml.Ref('AWS::Region', style), style)],
      ])('%s %j', (s, san) => {
        const template = yaml.dump({
          Resources: {
            Certificate: {
              Type: 'AWS::CertificateManager::Certificate',
              Properties: {
                DomainName: 'example.com',
                SubjectAlternativeNames: san
              }
            }
          }
        });
        expect(lint(template)).toEqual([]);
      });
      test.each([
        ['invalid type', new yaml.GetAZs({ a: '' }, style)],
        ['invalid type', new yaml.GetAZs([[], ''], style)],
        ['missing input', new yaml.GetAZs([''], style)],
        ['extra input', new yaml.GetAZs(['', [''], ''], style)],
      ])('%s %j', (s, san) => {
        const template = yaml.dump({
          Resources: {
            Certificate: {
              DomainName: 'example.com',
              SubjectAlternativeNames: san
            }
          }
        });
        expect(lint(template)).toMatchSnapshot();
      });
    });
  });

  describe('ImportValue', () => {
    describe.each(Styles)('%s', (style) => {
      test.each([
        ['', new yaml.ImportValue('', style)],
        ['Ref', new yaml.ImportValue(new yaml.Ref('AWS::Region', style), style)],
      ])('%s %j', (s, bucketName) => {
        expect(lint(t(bucketName))).toEqual([]);
      });
      test.each([
        ['invalid type', new yaml.ImportValue({ a: '' }, style)],
        ['invalid type', new yaml.ImportValue([[], ''], style)],
        ['missing input', new yaml.ImportValue([''], style)],
        ['extra input', new yaml.ImportValue(['', [''], ''], style)],
      ])('%s %j', (s, bucketName) => {
        expect(lint(t(bucketName))).toMatchSnapshot();
      });
    });
  });

  describe('Conditions', () => {
    describe('If', () => {
      test('AWS::NoValue', () => {
        const template = yaml.dump({
          Conditions: { ShouldReplicate: true },
          Resources: {
            A: {
              Type: 'AWS::S3::Bucket',
              Properties: {
                ReplicationConfiguration: {
                  'Fn::If': [
                    'ShouldReplicate',
                    {
                      Role: '',
                      Rules: [
                        {
                          Destination: { Bucket: '' },
                          Prefix: '',
                          Status: 'Enabled'
                        }
                      ]
                    },
                    { 'Ref': 'AWS::NoValue' }
                  ]
                }
              }
            }
          }
        });
        expect(lint(template)).toEqual([]);
      });

      describe.each(Styles)('%s', (style) => {
        describe('If', () => {
          test.each([
            ['valid input', new yaml.If([new yaml.Equals(['', ''], style), '', ''], style)],
            ['valid condition', new yaml.If([new yaml.Condition('C', style), '', ''], style)],
            ['NoValue first', new yaml.If([new yaml.Equals([new yaml.Ref('AWS::NoValue', style), ''], style), '', ''], style)],
            ['NoValue second', new yaml.If([new yaml.Equals(['', new yaml.Ref('AWS::NoValue', style)], style), '', ''], style)],
            // '1' is considered valid for a number and string
            ['overlapping values types', new yaml.If([true, 1, '1'], style)],
            ['overlapping values types', new yaml.If([true, 'foo', '1'], style)],
          ])('%s %j', (s, i) => {
            expect(lintWithProperty('Conditions.C', i)).toEqual([]);
          });
          test.each([
            ['invalid input', new yaml.If([new yaml.Equals(['', ''], style)], style)],
            ['invalid ref', new yaml.If([new yaml.Equals([new yaml.Ref('foo', style), ''], style), '', ''], style)],
            ['different values types', new yaml.If([true, 1, false], style)],
          ])('%s %j', (s, i) => {
            expect(lintWithProperty('Conditions.C', i)).toMatchSnapshot();
          });
        });

        describe('Not', () => {
          test.each([
            ['single input', new yaml.Not([new yaml.Equals(['', ''], style)], style)],
            ['multiple inputs', new yaml.Not([new yaml.Equals(['', ''], style), new yaml.Equals(['', ''], style)], style)],
            ['invalid array value', new yaml.Not([''], style)],
            ['invalid value', new yaml.Not('', style)],
          ])('%s %j', (s, i) => {
            expect(lintWithProperty('Conditions.C', i)).toMatchSnapshot();
          });
        });

        describe('And', () => {
          test.each([
            ['single input', new yaml.And([new yaml.Equals(['', ''], style)], style)],
            ['multiple inputs', new yaml.And([new yaml.Equals(['', ''], style), new yaml.Equals(['', ''], style)], style)],
          ])('%s %j', (s, i) => {
            expect(lintWithProperty('Conditions.C', i)).toEqual([]);
          });
          test.each([
            ['invalid array value', new yaml.And([''], style)],
            ['invalid value', new yaml.And('', style)],
          ])('%s %j', (s, i) => {
            expect(lintWithProperty('Conditions.C', i)).toMatchSnapshot();
          });
        });

        describe('Or', () => {
          test.each([
            ['single input', new yaml.Or([new yaml.Equals(['', ''], style)], style)],
            ['multiple inputs', new yaml.Or([new yaml.Equals(['', ''], style), new yaml.Equals(['', ''], style)], style)],
          ])('%s %j', (s, i) => {
            expect(lintWithProperty('Conditions.C', i)).toEqual([]);
          });
          test.each([
            ['invalid array value', new yaml.Or([''], style)],
            ['invalid value', new yaml.Or('', style)],
          ])('%s %j', (s, i) => {
            expect(lintWithProperty('Conditions.C', i)).toMatchSnapshot();
          });
        });
      });
    });
  });

  describe('Parameters', () => {
    test('invalid type', () => {
      const expected = [
        {
          path: ['Root', 'Parameters'],
          message: expect.stringMatching(/Object/)
        }
      ];
      const input = lintWithProperty('Parameters', 'test');
      expect(input).toMatchObject(expected);
    });

    test('missing Type', () => {
      const expected = [
        {
          path: ['Root', 'Parameters', 'Foo', 'Type'],
          message: expect.stringMatching(/required/)
        }
      ];
      const input = lintWithProperty('Parameters.Foo', {});
      expect(input).toMatchObject(expected);
    });

    test('invalid Type', () => {
      const expected = [
        {
          path: ['Root', 'Parameters', 'Foo', 'Type'],
          message: expect.stringMatching(/one of/)
        }
      ];
      const input = lintWithProperty('Parameters.Foo.Type', 'foo');
      expect(input).toMatchObject(expected);
    });

    test('SSM AWS Type', () => {
      const input = lintWithProperty('Parameters.Foo.Type', 'AWS::SSM::Parameter::Value<AWS::EC2::Subnet::Id>');
      expect(input).toEqual([]);
    });

    describe('Default', () => {

      test('invalid default', () => {
        const expected = [
          {
            path: ['Root', 'Parameters', 'Foo', 'Default'],
            message: expect.stringMatching(/Number/)
          }
        ];
        const template = yaml.dump({
          Parameters: {
            Foo: {
              Type: 'Number',
              Default: 'not a number'
            }
          },
          Resources: {}
        });
        expect(lint(template)).toMatchObject(expected);
      });

      test('exceed MinLength', () => {
        const expected = [
          {
            path: ['Root', 'Parameters', 'Foo', 'Default'],
            message: expect.stringMatching(/length/)
          }
        ];
        const template = yaml.dump({
          Parameters: {
            Foo: {
              Type: 'String',
              MinLength: 10,
              Default: 'foo'
            }
          },
          Resources: {}
        });
        expect(lint(template)).toMatchObject(expected);
      });

      test('not exceed MinLength', () => {
        const template = yaml.dump({
          Parameters: {
            Foo: {
              Type: 'String',
              MinLength: 3,
              Default: 'foo'
            }
          },
          Resources: {}
        });
        expect(lint(template)).toEqual([]);
      });

      test('exceed MaxLength', () => {
        const expected = [
          {
            path: ['Root', 'Parameters', 'Foo', 'Default'],
            message: expect.stringMatching(/length/)
          }
        ];
        const template = yaml.dump({
          Parameters: {
            Foo: {
              Type: 'String',
              MaxLength: 1,
              Default: 'foo'
            }
          },
          Resources: {}
        });
        expect(lint(template)).toMatchObject(expected);
      });

      test('not exceed MaxLength', () => {
        const template = yaml.dump({
          Parameters: {
            Foo: {
              Type: 'String',
              MaxLength: 3,
              Default: 'foo'
            }
          },
          Resources: {}
        });
        expect(lint(template)).toEqual([]);
      });

      test('exceed MaxValue', () => {
        const expected = [
          {
            path: ['Root', 'Parameters', 'Foo', 'Default'],
            message: expect.stringMatching(/MaxValue/)
          }
        ];
        const template = yaml.dump({
          Parameters: {
            Foo: {
              Type: 'Number',
              MaxValue: 1,
              Default: 2
            }
          },
          Resources: {}
        });
        expect(lint(template)).toMatchObject(expected);
      });

      test('not exceed MaxValue', () => {
        const template = yaml.dump({
          Parameters: {
            Foo: {
              Type: 'Number',
              MaxValue: 2,
              Default: 2
            }
          },
          Resources: {}
        });
        expect(lint(template)).toEqual([]);
      });

      test('not in AllowedValues', () => {
        const expected = [
          {
            path: ['Root', 'Parameters', 'Foo', 'Default'],
            message: expect.stringMatching(/AllowedValues/)
          }
        ];
        const template = yaml.dump({
          Parameters: {
            Foo: {
              Type: 'Number',
              AllowedValues: [1, 2],
              Default: 3
            }
          },
          Resources: {}
        });
        expect(lint(template)).toMatchObject(expected);
      });

      test('in AllowedValues', () => {
        const template = yaml.dump({
          Parameters: {
            Foo: {
              Type: 'Number',
              AllowedValues: [1, 2],
              Default: 2
            }
          },
          Resources: {}
        });
        expect(lint(template)).toEqual([]);
      });

      test('matching AllowedPattern', () => {
        const template = yaml.dump({
          Parameters: {
            Foo: {
              Type: 'String',
              AllowedPattern: '^abc$',
              Default: 'abc'
            }
          },
          Resources: {}
        });
        expect(lint(template)).toEqual([]);
      });

      test('not matching AllowedPattern', () => {
        const expected = [
          {
            path: ['Root', 'Parameters', 'Foo', 'Default'],
            message: expect.stringMatching(/AllowedPattern/)
          }
        ];
        const template = yaml.dump({
          Parameters: {
            Foo: {
              Type: 'String',
              AllowedPattern: '^abc$',
              Default: 'foo'
            }
          },
          Resources: {}
        });
        expect(lint(template)).toMatchObject(expected);
      });
    });

    describe('AllowedValues', () => {
      test('with non List', () => {
        const expected = [
          {
            path: ['Root', 'Parameters', 'Foo', 'AllowedValues'],
            message: expect.stringMatching(/List/)
          }
        ];
        const template = yaml.dump({
          Parameters: {
            Foo: {
              Type: 'String',
              AllowedValues: 'a'
            }
          },
          Resources: {}
        });
        expect(lint(template)).toMatchObject(expected);
      });

      test('with List', () => {
        const template = yaml.dump({
          Parameters: {
            Foo: {
              Type: 'String',
              AllowedValues: ['a'],
            }
          },
          Resources: {}
        });
        expect(lint(template)).toEqual([]);
      });

      test('values match Type', () => {
        const template = yaml.dump({
          Parameters: {
            Foo: {
              Type: 'String',
              AllowedValues: ['a', 'b'],
            }
          },
          Resources: {}
        });
        expect(lint(template)).toEqual([]);
      });

      test('values do not match Type', () => {
        const expected = [
          {
            path: ['Root', 'Parameters', 'Foo', 'AllowedValues', '1'],
            message: expect.stringMatching(/String/)
          },
          {
            path: ['Root', 'Parameters', 'Foo', 'AllowedValues', '3'],
            message: expect.stringMatching(/String/)
          }
        ];
        const template = yaml.dump({
          Parameters: {
            Foo: {
              Type: 'String',
              AllowedValues: ['a', [], 'b', []],
            }
          },
          Resources: {}
        });
        expect(lint(template)).toMatchObject(expected);
      });
    });

    describe('MaxLength', () => {
      test('with non String', () => {
        const expected = [
          {
            path: ['Root', 'Parameters', 'Foo', 'MaxLength'],
            message: expect.stringMatching(/String/)
          }
        ];
        const template = yaml.dump({
          Parameters: {
            Foo: {
              Type: 'Number',
              MaxLength: 1,
            }
          },
          Resources: {}
        });
        expect(lint(template)).toMatchObject(expected);
      });

      test('with String', () => {
        const template = yaml.dump({
          Parameters: {
            Foo: {
              Type: 'String',
              MaxLength: 1,
            }
          },
          Resources: {}
        });
        expect(lint(template)).toEqual([]);
      });
    });

    describe('MaxValue', () => {
      test('with non Number', () => {
        const expected = [
          {
            path: ['Root', 'Parameters', 'Foo', 'MaxValue'],
            message: expect.stringMatching(/Number/)
          }
        ];
        const template = yaml.dump({
          Parameters: {
            Foo: {
              Type: 'String',
              MaxValue: 1,
            }
          },
          Resources: {}
        });
        expect(lint(template)).toMatchObject(expected);
      });

      test('with Number', () => {
        const template = yaml.dump({
          Parameters: {
            Foo: {
              Type: 'Number',
              MaxValue: 1,
            }
          },
          Resources: {}
        });
        expect(lint(template)).toEqual([]);
      });
    });

    describe('AllowedPattern', () => {
      test('with String', () => {
        const template = yaml.dump({
          Parameters: {
            Foo: {
              Type: 'String',
              AllowedPattern: '^[a-z]$'
            }
          },
          Resources: {}
        });
        expect(lint(template)).toEqual([]);
      });

      test('with non String', () => {
        const expected = [
          {
            path: ['Root', 'Parameters', 'Foo', 'AllowedPattern'],
            message: expect.stringMatching(/String/)
          }
        ];
        const template = yaml.dump({
          Parameters: {
            Foo: {
              Type: 'String',
              AllowedPattern: {}
            }
          },
          Resources: {}
        });
        expect(lint(template)).toMatchObject(expected);
      });
    });
  });

  describe('Outputs', () => {
    test('invalid type', () => {
      expect(lintWithProperty('Outputs', '')).toMatchSnapshot();
    });
    test('empty', () => {
      expect(lintWithProperty('Outputs', {})).toMatchSnapshot();
    });
    test.each([
      ['value', { Value: 'v' }],
      ['description', { Value: 'v', Description: 'd' }],
      ['export', { Value: 'v', Export: { Name: 'n' } }],
      ['invalid type value', { Value: {} }],
      ['invalid type description', { Value: 'v', Description: {} }],
      ['invalid type export', { Value: 'v', Export: { Name: {} } }],
      ['missing export name', { Value: 'v', Export: {} }],
    ] as any[])('%s %j', (_s, output) => {
      expect(lintWithProperty('Outputs.O', output)).toMatchSnapshot();
    });
  });

  describe('Mappings', () => {
    test('invalid type', () => {
      expect(lintWithProperty('Mappings', '')).toMatchSnapshot();
    });
    test('empty', () => {
      expect(lintWithProperty('Mappings', {})).toMatchSnapshot();
    });
    test.each([
      ['empty object', {}],
      ['object', { 'a': { 'b': { 'c': 'd' } } }],
      ['object', { 'a': { 'b': '' } }],
    ] as any[])('%s %j', (_s, mapping) => {
      expect(lintWithProperty('Mappings', mapping)).toMatchSnapshot();
    });
  });

  describe('with parameters', () => {
    describe('string values', () => {
      const template = {
        Parameters: { ExpirationInDays: { Type: 'String' } },
        Resources: {
          A: {
            Type: 'AWS::S3::Bucket',
            Properties: {
              LifecycleConfiguration: {
                Rules: [{
                  Status: 'Enabled',
                  ExpirationInDays: new yaml.Ref('ExpirationInDays', 'Object')
                }]
              }
            }
          }
        }
      };
      test('valid default', () => {
        const t = yaml.dump(set('Parameters.ExpirationInDays.Default', '1', template));
        expect(lint(t)).toEqual([]);
      });
      test('invalid default', () => {
        const t = yaml.dump(set('Parameters.ExpirationInDays.Default', 'foo', template));
        expect(lint(t)).toMatchSnapshot();
      });
      test('valid value', () => {
        const t = yaml.dump(template);
        const parameters = { ExpirationInDays: '1' };
        expect(lint(t, parameters)).toEqual([]);
      });
      test('invalid value', () => {
        const t = yaml.dump(template);
        const parameters = { ExpirationInDays: 'foo' };
        expect(lint(t, parameters)).toMatchSnapshot();
      });
    });
  })

  describe('LaundryIgnore', () => {
    test('top-level metadata', () => {
      const template = yaml.dump({
        Metadata: {
          LaundryIgnore: {
            Resources: ['RootValidator']
          }
        },
        Resources: ''
      });
      expect(lint(template)).toEqual([]);
    });
    test('Resource metadata', () => {
      const template = yaml.dump({
        Resources: {
          A: {
            Type: 'AWS::S3::Bucket',
            Metadata: {
              LaundryIgnore: [
                'ResourcePropertyValidator'
              ]
            },
            Properties: {
              Foo: 'bar'
            }
          }
        }
      });
      expect(lint(template)).toEqual([]);
    });
    test('top-level metadata for resource exact', () => {
      const template = yaml.dump({
        Metadata: {
          LaundryIgnore: {
            'Resources.A.Properties.Foo': ['ResourcePropertyValidator']
          }
        },
        Resources: {
          A: {
            Type: 'AWS::S3::Bucket',
            Properties: {
              Foo: 'bar'
            }
          }
        }
      });
      expect(lint(template)).toEqual([]);
    });
    test('top-level metadata for resource glob', () => {
      const template = yaml.dump({
        Metadata: {
          LaundryIgnore: {
            'Resources.A.*': ['ResourcePropertyValidator']
          }
        },
        Resources: {
          A: {
            Type: 'AWS::S3::Bucket',
            Properties: {
              Foo: 'bar'
            }
          }
        }
      });
      expect(lint(template)).toEqual([]);
    });
  });

  describe('single "property types"', () => {
    test('valid', () => {
      const template = yaml.dump({
        Resources: {
          A: {
            Type: 'AWS::CodeBuild::Project',
            Properties: {
              Environment: {},
              ServiceRole: '',
              Source: {},
              Artifacts: {},
              Cache: {
                Modes: ['LOCAL_SOURCE_CACHE'] // This is a "SinglePropertyType"
              }
            }
          }
        }
      });
      expect(lint(template)).toEqual([]);
    });

    test('invalid', () => {
      const template = yaml.dump({
        Resources: {
          A: {
            Type: 'AWS::CodeBuild::Project',
            Properties: {
              Environment: {},
              ServiceRole: '',
              Source: {},
              Artifacts: {},
              Cache: {
                Modes: ''
              }
            }
          }
        }
      });
      expect(lint(template)).toMatchSnapshot();
    });

  });
});

describe('ignoredErrorMatcher', () => {
  test.each([
    [[], ['A', 'B'], false],
    [[['Not', 'Match']], ['A', 'B'], false],
    [[['*']], ['A', 'B'], true],
    [[['*'], ['Not', 'Match']], ['A', 'B'], true],
    [[['A', '*']], ['A', 'B', 'C'], true],
    [[['*', 'B']], ['A', 'B'], true],
    [[['*', 'B']], ['A', 'B', 'C'], false],
    [[['A', 'B', '*']], ['A', 'B'], false],
  ])('%s %s', (ignoredValidators, error, expected) => {
      const isIgnored = ignoredErrorMatcher(_.map(ignoredValidators as string[][],
                                                  (path) => ({ path, source: '' })));
    expect(isIgnored({ path: error as string[], message: '', source: '' })).toEqual(expected)
  });
});
