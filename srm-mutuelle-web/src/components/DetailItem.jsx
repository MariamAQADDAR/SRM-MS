export default function DetailItem({ label, children, fullWidth }) {
  return (
    <div className={'detail-item' + (fullWidth ? ' detail-item--full' : '')}>
      <div className="detail-label">{label}</div>
      <div className="detail-value">{children}</div>
    </div>
  );
}
