import * as _ from 'lodash';

import {lint} from '../index';
import * as yaml from '../yaml';

const testTemplate = {
  Resources: {
    Bucket: {
      Type: 'AWS::S3::Bucket',
      Properties: {}
    }
  }
}

function lintWithProperty(key: string, value: any) {
  const template = _.set(testTemplate, key, value);
  return lint(yaml.dump(template))
}

describe('lint', () => {

  test('valid template', () => {
    const template = yaml.dump({
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
      const expected =  [
        {
          path: ['Root', 'Resources', 'RecordSet', 'Name'],
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
              AllowedValues: ['a', 1, 'b', 2],
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

    describe('!Ref', () => {
      test('parameter', () => {
        const template = yaml.dump({
          Parameters: {
            Foo: {
              Type: 'String',
            }
          },
          Resources: {
            Bucket: {
              Type: 'AWS::S3::Bucket',
              Properties: {
                BucketName: new yaml.Ref('Foo')
              }
            }
          }
        });
        expect(lint(template)).toEqual([]);
      });
      test('resource', () => {
        const template = yaml.dump({
          Resources: {
            A: {Type: 'AWS::S3::Bucket'},
            B: {
              Type: 'AWS::S3::Bucket',
              Properties: {
                BucketName: new yaml.Ref('A')
              }
            }
          }
        });
        expect(lint(template)).toEqual([]);
      });
      test('pseudo parameter', () => {
        const template = yaml.dump({
          Resources: {
            A: {Type: 'AWS::S3::Bucket'},
            B: {
              Type: 'AWS::S3::Bucket',
              Properties: {
                BucketName: new yaml.Ref('AWS::Region')
              }
            }
          }
        });
        expect(lint(template)).toEqual([]);
      });
      test('invalid name', () => {
        const expected = [
          {
            path: ['Root', 'Resources', 'Bucket', 'Properties', 'BucketName'],
            message: expect.stringMatching(/Parameter or Resource/)
          }
        ];
        const template = yaml.dump({
          Resources: {
            Bucket: {
              Type: 'AWS::S3::Bucket',
              Properties: {
                BucketName: new yaml.Ref('Baz')
              }
            }
          }
        });
        expect(lint(template)).toMatchObject(expected);
      });
    });
  });
});
