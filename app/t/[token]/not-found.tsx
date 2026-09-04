export default function PublicLinkNotFound() {
  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-6">
      <div className="app-card p-10 text-center max-w-sm">
        <div className="text-4xl mb-4">🔌</div>
        <p className="text-[#1d1d1f] font-semibold text-[17px] tracking-tight">Lien indisponible</p>
        <p className="text-[#6e6e73] text-[14px] mt-2 leading-relaxed">
          Ce QR code n'est plus actif ou a été régénéré. Demandez à votre administrateur
          le lien à jour du module.
        </p>
      </div>
    </div>
  );
}
