import * as _ from 'lodash';

import { Error } from '../types';
import { lint } from '../index';
import * as yaml from '../yaml';

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

function lintWithProperty(key: string, value: any) {
  const template = _.set(_.cloneDeep(testTemplate), key, value);
  return lint(yaml.dump(template))
}

function t(value: any) {
  return yaml.dump(_.set(
    _.cloneDeep(testTemplate),
    ['Resources', 'Bucket', 'Properties', 'BucketName'],
    value
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
        Resources: { RecordSet: { Type: 'AWS::Route53::RecordSet', Properties: { Type: 'A' } } }
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
            Properties: { Type: 'A', Name: new yaml.Ref('AWS::NoValue', 'YAMLTag') }
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
          message: expect.stringMatching(/Foo/)
        }];
        const template = yaml.dump({
          Conditions: { C: true },
          Resources: { Bucket: { Condition: 'Foo', Type: 'AWS::S3::Bucket' } }
        });
        expect(lint(template)).toMatchObject(expected);
      });
    });

    describe('Sub', () => {
      describe.each(['Object', 'YAMLTag'])('%s', (style) => {
        test.each([
          // !Sub String
          ['valid resource', new yaml.Sub('${A}', style)],
          ['multiple resources', new yaml.Sub('a${A}b${B}c', style)],
          ['! is ignored', new yaml.Sub('${!Bar}', style), []],
          ['valid attribute', new yaml.Sub('${A.Arn}', style)],

          // !Sub [String, Object]
          ['valid resource', new yaml.Sub(['${A}', {}], style)],
          ['local ref', new yaml.Sub(['${Local}', { Local: 'a' }], style)],
        ])('%s %j', (s, bucketName) => {
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
        describe.each(['Object', 'YAMLTag'])('%s', (style) => {
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
      describe.each(['Object', 'YAMLTag'])('%s', (style) => {
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
    });

    describe('Base64', () => {
      describe.each(['Object', 'YAMLTag'])('%s', (style) => {
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
  });

  describe('Conditions', () => {
    describe('If', () => {
      describe.each(['Object', 'YAMLTag'])('%s', (style) => {
        describe('If', () => {
          test.each([
            ['valid input', new yaml.If([new yaml.Equals(['', ''], style), '', ''], style)],
            ['valid condition', new yaml.If([new yaml.Condition('C', style), '', ''], style)],
            ['NoValue first', new yaml.If([new yaml.Equals([new yaml.Ref('AWS::NoValue', style), ''], style), '', ''], style)],
            ['NoValue second', new yaml.If([new yaml.Equals(['', new yaml.Ref('AWS::NoValue', style)], style), '', ''], style)],
          ])('%s %j', (s, i) => {
            expect(lintWithProperty('Conditions.C', i)).toEqual([]);
          });
          test.each([
            ['invalid input', new yaml.If([new yaml.Equals(['', ''], style)], style)],
            ['invalid ref', new yaml.If([new yaml.Equals([new yaml.Ref('foo', style), ''], style), '', ''], style)],
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
    ])('%s %j', (s, output) => {
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
      ['invalid type', { 'a': { 'b': { 'd': [] } } }],
      ['object', { 'a': { 'b': '' } }],
    ])('%s %j', (s, mapping) => {
      expect(lintWithProperty('Mappings', mapping)).toMatchSnapshot();
    });
  });

});
