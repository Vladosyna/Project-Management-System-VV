// @ts-check
// OCS house rules (03-engineering-rules). Where a rule applies is decided in eslint.config.js;
// each rule here only detects the pattern and explains which document forbids it.
import path from 'node:path';

/** @typedef {import('eslint').Rule.RuleModule} RuleModule */
/** @typedef {import('eslint').Rule.Node} Node */

const HEX = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/i;
const COLOUR_FN = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\s*\(/i;
const FONT = /\b(?:Arial|Helvetica|Microsoft YaHei|PingFang SC|font-family)\b/i;
const HAS_LETTER = /\p{L}/u;
const SQL_DELETE = /\b(?:DELETE\s+FROM|TRUNCATE(?:\s+TABLE)?\s+\w)/i;
const DB_HANDLE = /^(?:db|tx|trx|database|sql|repo|repository)$/i;
const DB_MODULES = /^(?:@ocs\/db(?:\/.*)?|drizzle-orm(?:\/.*)?|pg|postgres|pg-boss)$/;
const VISIBLE_ATTRS = new Set(['title', 'alt', 'placeholder', 'label', 'aria-label', 'aria-description']);

/** @param {unknown} value */
const str = (value) => (typeof value === 'string' ? value : '');

/**
 * Text of a string literal or template chunk, or '' for anything else.
 * @param {any} node
 */
function literalText(node) {
  if (node.type === 'Literal') return str(node.value);
  if (node.type === 'TemplateElement') return str(node.value.cooked ?? node.value.raw);
  return '';
}

/** @type {RuleModule} */
const noRawColour = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Colours and fonts come from packages/ui design tokens only (03-engineering-rules §4, §9).',
    },
    messages: {
      colour:
        'Raw colour "{{value}}". Use a semantic token from @ocs/ui (03-engineering-rules §4, §9) — colours live only in packages/ui.',
      font: 'Font name "{{value}}". Typography comes from @ocs/ui tokens (03-engineering-rules §9).',
    },
    schema: [],
  },
  create(context) {
    /** @param {any} node */
    function check(node) {
      const text = literalText(node);
      const colour = HEX.exec(text) ?? COLOUR_FN.exec(text);
      if (colour) context.report({ node, messageId: 'colour', data: { value: colour[0] } });
      const font = FONT.exec(text);
      if (font) context.report({ node, messageId: 'font', data: { value: font[0] } });
    }
    return { Literal: check, TemplateElement: check };
  },
};

/** @type {RuleModule} */
const noInlineStyle = {
  meta: {
    type: 'problem',
    docs: { description: 'No inline style objects outside packages/ui (03-engineering-rules §4).' },
    messages: {
      inline: 'Inline style. Build the look from @ocs/ui components and tokens (03-engineering-rules §4).',
    },
    schema: [],
  },
  create(context) {
    return {
      /** @param {any} node */
      JSXAttribute(node) {
        if (node.name?.name === 'style') context.report({ node, messageId: 'inline' });
      },
    };
  },
};

/** @type {RuleModule} */
const noLiteralString = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Every user-visible string is an i18n key with EN and 中文 values (03-engineering-rules §8).',
    },
    messages: {
      literal:
        'User-visible text "{{text}}" is hard-coded. Add an EN + 中文 key to @ocs/i18n and use t(...) (03-engineering-rules §8).',
    },
    schema: [],
  },
  create(context) {
    /** @param {Node} node @param {string} text */
    function report(node, text) {
      if (HAS_LETTER.test(text)) {
        context.report({ node, messageId: 'literal', data: { text: text.trim().slice(0, 40) } });
      }
    }
    return {
      /** @param {any} node */
      JSXText(node) {
        report(node, str(node.value));
      },
      /** @param {any} node */
      JSXExpressionContainer(node) {
        if (node.parent?.type === 'JSXAttribute') return; // attributes are handled below
        const text = literalText(node.expression);
        if (text) report(node, text);
        if (node.expression.type === 'TemplateLiteral') {
          for (const q of node.expression.quasis) report(q, literalText(q));
        }
      },
      /** @param {any} node */
      JSXAttribute(node) {
        const name = typeof node.name?.name === 'string' ? node.name.name : '';
        if (!VISIBLE_ATTRS.has(name) || !node.value) return;
        const value = node.value.type === 'JSXExpressionContainer' ? node.value.expression : node.value;
        report(node, literalText(value));
      },
    };
  },
};

/** @type {RuleModule} */
const noBusinessDelete = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Business records are archived, never deleted (03-engineering-rules §6, SOP-DEL-02).',
    },
    messages: {
      call: 'Deleting rows is forbidden — archive instead (set archived_at). 03-engineering-rules §6, SOP-DEL-02 "never delete". Technical tables are allow-listed in eslint.config.js by the architect role.',
      sql: 'SQL that deletes rows ("{{text}}") is forbidden — archive instead. 03-engineering-rules §6, SOP-DEL-02.',
    },
    schema: [],
  },
  create(context) {
    const isRepository = /(?:^|[\\/])repository\.ts$/.test(context.filename);
    /** @param {any} node */
    function checkText(node) {
      const m = SQL_DELETE.exec(literalText(node));
      if (m) context.report({ node, messageId: 'sql', data: { text: m[0] } });
    }
    return {
      /** @param {any} node */
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== 'MemberExpression' || callee.computed) return;
        if (callee.property.type !== 'Identifier' || callee.property.name !== 'delete') return;
        const obj = callee.object;
        const objName =
          obj.type === 'Identifier'
            ? obj.name
            : obj.type === 'MemberExpression' && obj.property.type === 'Identifier'
              ? obj.property.name
              : '';
        if (isRepository || DB_HANDLE.test(objName)) context.report({ node, messageId: 'call' });
      },
      Literal: checkText,
      TemplateElement: checkText,
    };
  },
};

/** @type {RuleModule} */
const noDbImport = {
  meta: {
    type: 'problem',
    docs: {
      description: "Database access only through the module's repository.ts (03-engineering-rules §4).",
    },
    messages: {
      db: '"{{source}}" may be imported only in a module\'s repository.ts (and packages/db, core/kernel, testing). Call a command or query of the owning module instead (03-engineering-rules §4, 02-architecture §3).',
    },
    schema: [],
  },
  create(context) {
    /** @param {any} node */
    function check(node) {
      const source = node.source && node.source.type === 'Literal' ? str(node.source.value) : '';
      if (DB_MODULES.test(source)) context.report({ node, messageId: 'db', data: { source } });
    }
    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: check,
      ExportAllDeclaration: check,
      ImportExpression: check,
    };
  },
};

/** @type {RuleModule} */
const noDangerousHtml = {
  meta: {
    type: 'problem',
    docs: { description: 'No raw HTML injection (03-engineering-rules §7).' },
    messages: {
      html: 'Raw HTML injection ({{what}}) is forbidden — render text through React (03-engineering-rules §7).',
    },
    schema: [],
  },
  create(context) {
    return {
      /** @param {any} node */
      JSXAttribute(node) {
        if (node.name?.name === 'dangerouslySetInnerHTML') {
          context.report({ node, messageId: 'html', data: { what: 'dangerouslySetInnerHTML' } });
        }
      },
      /** @param {any} node */
      AssignmentExpression(node) {
        const left = node.left;
        if (left.type === 'MemberExpression' && left.property.type === 'Identifier') {
          if (left.property.name === 'innerHTML' || left.property.name === 'outerHTML') {
            context.report({ node, messageId: 'html', data: { what: left.property.name } });
          }
        }
      },
    };
  },
};

/**
 * The element a repo-relative path belongs to and the part of the path inside it.
 * packages/core/<module> has entry `index.ts`; every other package, app and tool has `src/index.ts`.
 * @param {string} rel POSIX path relative to the repo root
 * @returns {{ root: string, inner: string, entry: string } | null}
 */
function elementOf(rel) {
  const parts = rel.split('/');
  if (parts[0] === 'packages' && parts[1] === 'core' && parts[2]) {
    return { root: parts.slice(0, 3).join('/'), inner: parts.slice(3).join('/'), entry: 'index' };
  }
  if ((parts[0] === 'packages' || parts[0] === 'apps' || parts[0] === 'tools') && parts[1]) {
    return { root: parts.slice(0, 2).join('/'), inner: parts.slice(2).join('/'), entry: 'src/index' };
  }
  return null;
}

/** @param {string} inner @param {string} entry */
function isEntry(inner, entry) {
  const bare = inner.replace(/\.(?:ts|tsx|js|jsx|mjs)$/, '').replace(/\/$/, '');
  return bare === entry || bare === entry.replace(/\/?index$/, '');
}

/** @type {RuleModule} */
const publicApiOnly = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Another module or package is imported only through its public index.ts (02-architecture §2–3).',
    },
    messages: {
      internal:
        '"{{source}}" reaches into the internals of {{target}}. Import it only through its public index.ts (02-architecture §2–3).',
    },
    schema: [],
  },
  create(context) {
    const from = elementOf(path.relative(context.cwd, context.filename).split(path.sep).join('/'));
    /** @param {any} node */
    function check(node) {
      const source = node.source && node.source.type === 'Literal' ? str(node.source.value) : '';
      if (!source) return;
      let target = null;
      if (source.startsWith('.')) {
        const abs = path.resolve(path.dirname(context.filename), source);
        target = elementOf(path.relative(context.cwd, abs).split(path.sep).join('/'));
      } else if (source.startsWith('@ocs/')) {
        const [, pkg = '', ...rest] = source.split('/');
        target =
          pkg === 'core'
            ? {
                root: `packages/core/${rest[0] ?? ''}`,
                inner: rest.length > 1 ? rest.slice(1).join('/') : 'index',
                entry: 'index',
              }
            : { root: pkg, inner: rest.length ? rest.join('/') : 'src/index', entry: 'src/index' };
        if (pkg === 'core' && rest.length === 0) target.inner = '<package root>';
      }
      if (!target || (from && from.root === target.root)) return;
      if (!isEntry(target.inner, target.entry)) {
        context.report({ node, messageId: 'internal', data: { source, target: target.root } });
      }
    }
    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: check,
      ExportAllDeclaration: check,
      ImportExpression: check,
    };
  },
};

const plugin = {
  meta: { name: '@ocs/eslint-plugin' },
  rules: {
    'public-api-only': publicApiOnly,
    'no-raw-colour': noRawColour,
    'no-inline-style': noInlineStyle,
    'no-literal-string': noLiteralString,
    'no-business-delete': noBusinessDelete,
    'no-db-import': noDbImport,
    'no-dangerous-html': noDangerousHtml,
  },
};

export default plugin;
