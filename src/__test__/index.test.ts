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

test('valid', () => {
  expect(validate('Resources: {}')).toEqual([]);
});
