import {validate} from '../index';

test('empty template', () => {
  const expected = {
    path: ['Root'],
    message: expect.stringMatching(/object/)
  };
  expect(validate('')[0]).toMatchObject(expected);
});

test('missing resources', () => {
  const expected = [{
    path: ['Root', 'Resources'],
    message: expect.stringMatching(/required/)
  }];
  expect(validate('{}')).toMatchObject(expected);
});

test('required property', () => {
  const expected =  [
    {
      path: ['Root', 'Resources', 'RecordSet', 'Name'],
      message: expect.stringMatching(/required/)
    }
  ]
  const template = `
Resources:
  RecordSet:
    Type: AWS::Route53::RecordSet
    Properties: {}
`
  expect(validate(template)).toMatchObject(expected);
});

test('valid', () => {
  const template = `
Resources:
  Bucket:
    Type: AWS::S3::Bucket
    Properties: {}
`
  expect(validate(template)).toEqual([]);
});
