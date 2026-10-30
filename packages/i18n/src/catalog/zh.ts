// 中文 catalogue. Keys and {placeholders} must match en.ts exactly (types + i18n.test.ts).
// Navigation labels follow the approved mockups; other wording to be checked by a Chinese-speaking PM.
import type { Catalog } from '../types.ts';

export const zh = {
  'brand.name': 'Vionvision',
  'app.tagline': 'OCS · 交付平台',

  'nav.label': '主导航',
  'nav.home': '首页',
  'nav.portfolio': '项目总览',
  'nav.projects': '项目',
  'nav.sites': '门店',
  'nav.platform': '平台与算法',
  'nav.actions': '行动与预警',
  'nav.cases': '案例',
  'nav.commercial': '商务',
  'nav.clientPortal': '客户门户',
  'nav.partnerApp': '供应商端',
  'nav.knowledge': '知识库',
  'nav.admin': '系统管理',

  'shell.search.label': '搜索',
  'shell.search.placeholder': '搜索项目、门店、SN / MAC、PO、人员…',
  'shell.notifications': '通知',
  'shell.signedInAs': '当前用户：{name}',
  'shell.clock.beijing': '北京',
  'shell.clock.madrid': '马德里',
  'shell.clock.london': '伦敦',
  'shell.language.toggle': 'EN',
  'shell.language.toggleLabel': '切换为英文',

  'role.director': '交付总监',
  'role.pm': '项目经理',
  'role.sales': '销售',
  'role.rnd': '研发',
  'role.finance': '财务',
  'role.management': '管理层',
  'role.sponsor': '项目发起人',
  'role.admin': '管理员',
  'role.client': '客户',
  'role.partner': '合作伙伴',
  'role.system': '系统',

  'status.ok': '已完成',
  'status.progress': '进行中',
  'status.risk': '有风险',
  'status.wait': '等待中',
  'status.breach': '已逾期',
  'status.escalated': '已升级',

  'home.eyebrow': '/ 01 首页',
  'home.greeting.morning': '早上好，{name}',
  'home.greeting.afternoon': '下午好，{name}',
  'home.greeting.evening': '晚上好，{name}',
} as const satisfies Catalog;
