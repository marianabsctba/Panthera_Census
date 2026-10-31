import { useEffect, useState, type MouseEvent, type ReactNode } from "react";

const LARGURA_DE_CELULAR = 760;
const noCelular = () => window.innerWidth <= LARGURA_DE_CELULAR;

// Abre a seção pedida no menu e rola até ela, mesmo que esteja fechada no celular.
export function irPara(id: string) {
  window.dispatchEvent(new CustomEvent("abrir-secao", { detail: id }));
  // Espera a seção abrir antes de rolar, senão a posição muda depois do pulo.
  setTimeout(() => document.getElementById(id)?.scrollIntoView(), 60);
}

// No computador, tudo aberto. No celular, cada seção abre ao toque, para a página não virar um rolo sem fim.
export default function Secao({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  const [aberta, setAberta] = useState(() => !noCelular() || window.location.hash === `#${id}`);

  useEffect(() => {
    const abrir = (ev: Event) => {
      if ((ev as CustomEvent<string>).detail === id) setAberta(true);
    };
    window.addEventListener("abrir-secao", abrir);
    return () => window.removeEventListener("abrir-secao", abrir);
  }, [id]);

  const alternar = (ev: MouseEvent) => {
    ev.preventDefault();
    if (noCelular()) setAberta(!aberta);
  };

  return (
    <details id={id} className="secao" open={aberta}>
      <summary className="titulo-secao" onClick={alternar}>{titulo}</summary>
      {aberta && <div className="secao-corpo">{children}</div>}
    </details>
  );
}
