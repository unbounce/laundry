import * as _ from 'lodash';

import { Error } from '../types';
import { lint } from '../index';
import * as yaml from '../yaml';

const testTemplate = {
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

function e(message: string, path: string[] = []) {
  return {
    path: ['Root', 'Resources', 'Bucket', 'Properties', 'BucketName'].concat(path),
    message: expect.stringMatching(new RegExp(message))
  };
}

function c(cfnFnName: string, style: string) {
  if(cfnFnName === 'Ref') {
    return 'Ref';
  } else {
    if(style === 'YAML') {
      return cfnFnName;
    } else {
      return `Fn::${cfnFnName}`;
    }
  }
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
    test('missing resources', () => {
      const expected = [{
        path: ['Root', 'Resources'],
        message: expect.stringMatching(/required/)
      }];
      expect(lint('{}')).toMatchObject(expected);
    });

    test('required property', () => {
      const expected = [
        {
          path: ['Root', 'Resources', 'RecordSet', 'Properties', 'Name'],
          message: expect.stringMatching(/required/)
        },
        {
          path: ['Root', 'Resources', 'RecordSet', 'Properties', 'Type'],
          message: expect.stringMatching(/required/)
        }
      ]
      const template = yaml.dump({
        Resources: {
          RecordSet: {
            Type: 'AWS::Route53::RecordSet',
            Properties: {}
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

    describe('Sub', () => {
      describe.each(['JSON', 'YAML'])('%s', (style) => {
        test.each([
          // !Sub String
          ['valid resource', new yaml.Sub('${A}', style), []],
          ['multiple resources', new yaml.Sub('a${A}b${B}c', style), []],
          ['invalid resource',
           new yaml.Sub('${Blag}', style),
           [e('Blag', [c('Sub', style)])]],
          ['! is ignored', new yaml.Sub('${!Bar}', style), []],
          ['multiple with invalid resource',
           new yaml.Sub('a${Bar}b${B}', style),
           [e('Bar', [c('Sub', style)])]],
          ['valid attribute', new yaml.Sub('${A.Arn}', style), []],
          ['invalid attribute',
           new yaml.Sub('${A.Bar}', style),
           [e('Bar', [c('Sub', style)])]],

          // !Sub [String, Object]
          ['valid resource', new yaml.Sub(['${A}', {}], style), []],
          ['local ref', new yaml.Sub(['${Local}', { Local: 'a' }], style), []],

          ['invalid type',
           new yaml.Sub(['${A}'], style),
           [e('or', [c('Sub', style)])]],
          ['invalid type',
           new yaml.Sub([{}, '${A}'], style),
           [e('String', [c('Sub', style), '0']), e('Object', [c('Sub', style), '1'])]],
          ['invalid type',
           new yaml.Sub({}, style),
           [e('or', [c('Sub', style)])]],
        ])('%s %j', (s, bucketName, errors) => {
          expect(lint(t(bucketName))).toMatchObject(errors);
        });
      });
    });

    describe('GetAtt', () => {
      test.each([
        // !GetAtt String
        ['valid resource YAML', new yaml.GetAtt('A.Arn', 'YAML'), []],
        ['invalid resource YAML', new yaml.GetAtt('Blag.Arn', 'YAML'), [e('Blag', ['GetAtt'])]],
        ['invalid attribute YAML', new yaml.GetAtt('A.Bar', 'YAML'), [e('Bar', ['GetAtt'])]],

        // !GetAtt [String, String]
        ['valid resource JSON', new yaml.GetAtt(['A', 'Arn'], 'JSON'), []],
        ['invalid resource JSON', new yaml.GetAtt(['A', 'Cat'], 'JSON'), [e('Cat', ['Fn::GetAtt'])]],
        ['valid resource YAML', new yaml.GetAtt(['A', 'Arn'], 'YAML'), []],
        ['invalid resource YAML', new yaml.GetAtt(['A', 'Cat'], 'YAML'), [e('Cat', ['GetAtt'])]],

        ['invalid type', new yaml.GetAtt(['${A}'], 'JSON'), [e('List', ['Fn::GetAtt'])]],
        ['invalid type', new yaml.GetAtt([{}, '${A}'], 'JSON'), [e('List', ['Fn::GetAtt'])]],
        ['invalid type', new yaml.GetAtt({}, 'JSON'), [e('String', ['Fn::GetAtt'])]],
        ['invalid type', new yaml.GetAtt({}, 'YAML'), [e('or', ['GetAtt'])]],
      ])('%s %j', (s, bucketName, errors) => {
        expect(lint(t(bucketName))).toMatchObject(errors);
      });
    });

    describe('Ref', () => {
      describe.each(['JSON', 'YAML'])('%s', (style) => {
        test.each([
          ['valid resource', new yaml.Ref('A', style), []],
          ['invalid resource', new yaml.Ref('Blag', style), [e('Blag', ['Ref'])]],
          ['invalid type', new yaml.Ref(['A'], style), [e('String', ['Ref'])]],
          // ['invalid type', new yaml.Ref({ a: 'A' }, style), [e('String', ['Ref'])]],
        ])('%s %s', (s, bucketName, errors) => {
          expect(lint(t(bucketName))).toMatchObject(errors);
        });
      });
    });

    describe('Base64', () => {
      describe.each(['JSON', 'YAML'])('%s', (style) => {
        test.each([
          ['string', new yaml.Base64('abc', style), []],
          ['Ref', new yaml.Base64(new yaml.Ref('A', style), style), []],
          ['Sub', new yaml.Base64(new yaml.Sub('${A}', style), style), []],
          ['Ref with invalid resource',
           new yaml.Base64(new yaml.Ref('Nothing', style), style),
           [e('Nothing', [c('Base64', style), 'Ref'])]],
        ])('%s %s', (s, bucketName, errors) => {
          expect(lint(t(bucketName))).toMatchObject(errors);
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

});
