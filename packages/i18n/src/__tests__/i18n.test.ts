import { describe, expect, it } from 'vitest';
import { catalogs, languages, translate } from '../index.ts';

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('catalogues', () => {
  it('every language has exactly the English keys', () => {
    const keys = Object.keys(catalogs.en).sort();
    for (const lang of languages) expect(Object.keys(catalogs[lang]).sort()).toEqual(keys);
  });

  it('no text is empty and every translation keeps the same {placeholders}', () => {
    for (const lang of languages) {
      for (const [key, text] of Object.entries(catalogs[lang])) {
        expect(text.trim(), `${lang} ${key}`).not.toBe('');
        expect(placeholders(text), `${lang} ${key}`).toEqual(
          placeholders(catalogs.en[key as keyof typeof catalogs.en]),
        );
      }
    }
  });
});

describe('translate', () => {
  it('fills placeholders in both languages', () => {
    expect(translate('en', 'home.greeting.afternoon', { name: 'Person 01' })).toBe(
      'Good afternoon, Person 01',
    );
    expect(translate('zh', 'home.greeting.afternoon', { name: 'Person 01' })).toBe('下午好，Person 01');
  });

  it('leaves an unknown placeholder visible instead of hiding it', () => {
    expect(translate('en', 'shell.signedInAs')).toBe('Signed in as {name}');
  });
});
