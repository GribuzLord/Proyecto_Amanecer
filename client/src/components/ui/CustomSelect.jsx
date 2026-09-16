import { useState, useRef, useEffect } from 'react';

export default function CustomSelect({ value, onChange, options, placeholder = '-- Seleccionar --' }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

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

  const selectedOption = options.find(opt => String(opt.value) === String(value));

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Botón que actúa como el input visible */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
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
          <ul className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
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
