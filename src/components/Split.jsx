import { Children, cloneElement, isValidElement } from 'react';

// Renders a heading with every word wrapped for the GSAP word-reveal.
// The heading keeps an unsplit aria-label; the split words are aria-hidden.
const textOf = (node) => {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement(node)) return textOf(node.props.children);
  return '';
};

const words = (str, keyBase) =>
  str.split(/(\s+)/).map((t, i) =>
    /^\s+$/.test(t) ? ' ' : t ? (
      <span className="w" aria-hidden="true" key={keyBase + i}><span className="wi">{t}</span></span>
    ) : null,
  );

export default function Split({ as: Tag = 'h2', className = '', children, ...rest }) {
  const label = textOf(children).replace(/\s+/g, ' ').trim();
  const out = [];
  Children.forEach(children, (child, ci) => {
    if (typeof child === 'string') out.push(...words(child, `t${ci}-`));
    else if (isValidElement(child)) {
      const inner = typeof child.props.children === 'string' ? words(child.props.children, `e${ci}-`) : child.props.children;
      out.push(cloneElement(child, { key: `c${ci}`, className: `${child.props.className || ''} em-split`.trim() }, inner));
    }
  });
  return <Tag className={`${className} split`.trim()} aria-label={label} data-split="1" {...rest}>{out}</Tag>;
}
