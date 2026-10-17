import { useState, useRef, useEffect, useCallback } from 'react';

function normalizeStr(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export default function CustomSelect({ value, onChange, options, placeholder = '-- Seleccionar --' }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState('');
  const searchTimeoutRef = useRef(null);

  // Cerrar al hacer clic fuera del componente
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      return;
    }

    if (e.key === 'Enter') {
      if (isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
      return;
    }

    // Navegación con flechas (Arriba / Abajo)
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      const currentIndex = options.findIndex(opt => String(opt.value) === String(value));
      let nextIndex = e.key === 'ArrowDown' ? currentIndex + 1 : currentIndex - 1;
      if (nextIndex >= options.length) nextIndex = 0;
      if (nextIndex < 0) nextIndex = options.length - 1;

      const nextOpt = options[nextIndex];
      if (nextOpt) {
        onChange(nextOpt.value);
        if (listRef.current) {
          const el = listRef.current.querySelector(`[data-value="${nextOpt.value}"]`);
          if (el) el.scrollIntoView({ block: 'nearest' });
        }
      }
      return;
    }

    // Búsqueda predictiva por texto
    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      const char = e.key.toLowerCase();
      const newTerm = searchTerm + char;
      setSearchTerm(newTerm);

      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        setSearchTerm('');
      }, 700);

      const cleanTerm = normalizeStr(newTerm);
      const foundOpt = options.find(opt => normalizeStr(opt.label).startsWith(cleanTerm));
      if (foundOpt) {
        onChange(foundOpt.value);
        if (isOpen && listRef.current) {
          const el = listRef.current.querySelector(`[data-value="${foundOpt.value}"]`);
          if (el) el.scrollIntoView({ block: 'nearest' });
        }
      }
    }
  }, [isOpen, searchTerm, options, value, onChange]);

  // Listener global mientras el menú esté desplegado:
  // En Safari, los botones no ganan foco al hacer clic. Este listener asegura que
  // cualquier tecla presionada mientras el selector esté abierto sea capturada.
  useEffect(() => {
    if (!isOpen) return;

    function handleGlobalKeyDown(e) {
      // No interceptar si el usuario está escribiendo en un input o textarea real
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      handleKeyDown(e);
    }

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  const selectedOption = options.find(opt => String(opt.value) === String(value));

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Botón que actúa como el input visible */}
      <button
        ref={buttonRef}
        type="button"
        onKeyDown={handleKeyDown}
        onClick={() => {
          setIsOpen(!isOpen);
          buttonRef.current?.focus();
        }}
        className="w-full text-left appearance-none rounded-xl border border-slate-300 px-4 py-2.5 pr-10 text-sm bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none font-medium transition-shadow text-ellipsis overflow-hidden whitespace-nowrap"
      >
        {selectedOption ? (
          <span className="text-slate-800">
            {selectedOption.label} <span className="text-slate-400 font-normal">{selectedOption.subLabel}</span>
          </span>
        ) : (
          <span className="text-slate-400">{placeholder}</span>
        )}

        {/* Icono de flecha */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
          <svg className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Lista desplegable animada */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-100">
          <ul className="max-h-60 overflow-y-auto py-1 custom-scrollbar" ref={listRef}>
            {/* Opción vacía por defecto */}
            <li
              className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${!value ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-slate-500 hover:bg-slate-50'}`}
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
            >
              {placeholder}
            </li>
            
            {/* Opciones reales */}
            {options.map(opt => {
              const isSelected = String(opt.value) === String(value);
              return (
                <li
                  key={opt.value}
                  data-value={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`px-4 py-2.5 text-sm flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-slate-700 hover:bg-slate-50 hover:text-brand-600'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {opt.subLabel && (
                    <span className={`text-xs ml-2 shrink-0 ${isSelected ? 'text-brand-500 font-medium' : 'text-slate-400'}`}>
                      {opt.subLabel}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
