/** Contenu modal « Voir le détail » : grille multi-colonnes + pied hors grille. */
export default function DetailView({ children, footer }) {
  return (
    <>
      <div className="detail-grid detail-grid--modal">{children}</div>
      {footer}
    </>
  );
}
