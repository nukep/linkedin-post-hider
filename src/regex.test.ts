// Note: Claude Sonnet 4.5 (AI) wrote the majority of these tests

import { regexFromLiteralWord } from './regex';

describe('regexFromLiteralWord', () => {
  describe('word boundary handling', () => {
    it('should add word boundaries for alphanumeric words', () => {
      const regex = regexFromLiteralWord('hello');
      
      // Should match the word "hello" as a standalone word
      expect(regex.test('hello')).toBe(true);
      expect(regex.test('hello world')).toBe(true);
      expect(regex.test('say hello there')).toBe(true);
      
      // Should NOT match when "hello" is part of another word
      expect(regex.test('helloworld')).toBe(false);
      expect(regex.test('sayhello')).toBe(false);
    });

    it('should add word boundary at start for words starting with alphanumeric', () => {
      const regex = regexFromLiteralWord('test123');
      
      expect(regex.test('test123')).toBe(true);
      expect(regex.test('test123!')).toBe(true);
      
      // Should NOT match when preceded by alphanumeric
      expect(regex.test('mytest123')).toBe(false);
    });

    it('should add word boundary at end for words ending with alphanumeric', () => {
      const regex = regexFromLiteralWord('123test');
      
      expect(regex.test('123test')).toBe(true);
      expect(regex.test('!123test')).toBe(true);
      
      // Should NOT match when followed by alphanumeric
      expect(regex.test('123testing')).toBe(false);
    });

    it('should not add word boundaries for non-alphanumeric characters', () => {
      const regex = regexFromLiteralWord('#hashtag');
      
      // Should match with or without word boundaries since # is not alphanumeric
      expect(regex.test('#hashtag')).toBe(true);
      expect(regex.test('test#hashtag')).toBe(true);
    });

    it('should handle words with special characters at the end', () => {
      const regex = regexFromLiteralWord('hello!');
      
      expect(regex.test('hello!')).toBe(true);
      expect(regex.test('say hello!')).toBe(true);
      
      // Should NOT match when "hello" is part of another word
      expect(regex.test('helloworld!')).toBe(false);
    });
  });

  describe('case insensitivity', () => {
    it('should match case-insensitively', () => {
      const regex = regexFromLiteralWord('test');
      
      expect(regex.test('test')).toBe(true);
      expect(regex.test('Test')).toBe(true);
      expect(regex.test('TEST')).toBe(true);
      expect(regex.test('TeSt')).toBe(true);
    });
  });

  describe('special character escaping', () => {
    it('should escape regex special characters', () => {
      const regex = regexFromLiteralWord('a.b');
      
      // Should match literal "a.b", not "a" followed by any character followed by "b"
      expect(regex.test('a.b')).toBe(true);
      expect(regex.test('axb')).toBe(false);
    });

    it('should escape asterisk', () => {
      const regex = regexFromLiteralWord('a*b');
      
      expect(regex.test('a*b')).toBe(true);
      expect(regex.test('ab')).toBe(false);
      expect(regex.test('aab')).toBe(false);
    });

    it('should escape plus sign', () => {
      const regex = regexFromLiteralWord('a+b');
      
      expect(regex.test('a+b')).toBe(true);
      expect(regex.test('ab')).toBe(false);
      expect(regex.test('aab')).toBe(false);
    });

    it('should escape question mark', () => {
      const regex = regexFromLiteralWord('a?b');
      
      expect(regex.test('a?b')).toBe(true);
      expect(regex.test('ab')).toBe(false);
    });

    it('should escape parentheses', () => {
      const regex = regexFromLiteralWord('(test)');
      
      expect(regex.test('(test)')).toBe(true);
    });

    it('should escape square brackets', () => {
      const regex = regexFromLiteralWord('[test]');
      
      expect(regex.test('[test]')).toBe(true);
      expect(regex.test('test')).toBe(false);
    });

    it('should escape curly braces', () => {
      const regex = regexFromLiteralWord('a{2}');
      
      expect(regex.test('a{2}')).toBe(true);
      expect(regex.test('aa')).toBe(false);
    });

    it('should escape backslash', () => {
      const regex = regexFromLiteralWord('a\\b');
      
      expect(regex.test('a\\b')).toBe(true);
    });

    it('should escape caret and dollar sign', () => {
      const regex1 = regexFromLiteralWord('^start');
      const regex2 = regexFromLiteralWord('end$');
      
      expect(regex1.test('^start')).toBe(true);
      expect(regex2.test('end$')).toBe(true);
    });

    it('should escape pipe character', () => {
      const regex = regexFromLiteralWord('a|b');
      
      expect(regex.test('a|b')).toBe(true);
      expect(regex.test('a')).toBe(false);
      expect(regex.test('b')).toBe(false);
    });
  });

  describe('unicode support', () => {
    it('should handle unicode characters', () => {
      const regex = regexFromLiteralWord('café');
      
      expect(regex.test('café')).toBe(true);
      expect(regex.test('CAFÉ')).toBe(true);
    });

    it('should handle emoji', () => {
      const regex = regexFromLiteralWord('hello👋');
      
      expect(regex.test('hello👋')).toBe(true);
      expect(regex.test('hello👋world')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle single character', () => {
      const regex = regexFromLiteralWord('a');
      
      expect(regex.test('a')).toBe(true);
      expect(regex.test('a b')).toBe(true);
      expect(regex.test('ab')).toBe(false);
    });

    it('should handle underscore (word character)', () => {
      const regex = regexFromLiteralWord('test_case');
      
      expect(regex.test('test_case')).toBe(true);
      expect(regex.test('my_test_case')).toBe(false);
      expect(regex.test('test_case_here')).toBe(false);
    });

    it('should handle numbers', () => {
      const regex = regexFromLiteralWord('123');
      
      expect(regex.test('123')).toBe(true);
      expect(regex.test('test 123 here')).toBe(true);
      expect(regex.test('1234')).toBe(false);
      expect(regex.test('abc123def')).toBe(false);
    });
  });
});
