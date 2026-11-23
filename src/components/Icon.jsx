// Thin wrapper around the Iconify web component (Solar icon set + brand logos).
export default function Icon({ name, ...rest }) {
  return <iconify-icon icon={name} {...rest}></iconify-icon>;
}
