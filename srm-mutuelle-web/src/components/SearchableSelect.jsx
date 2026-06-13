import React, { useState, useEffect, useRef } from 'react';
import FaIcon from './FaIcon';

export default function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Sélectionner...',
  required = false,
  label = '',
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  // Sync search input text with the selected option
  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  useEffect(() => {
    if (selectedOption) {
      setSearchTerm(selectedOption.label);
    } else {
      setSearchTerm('');
    }
  }, [value, selectedOption]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        // Reset query text to the selected option label if closed without selecting
        if (selectedOption) {
          setSearchTerm(selectedOption.label);
        } else {
          setSearchTerm('');
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedOption]);

  const filteredOptions = options.filter((opt) =>
    (opt.label || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (opt.subtitle || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (opt) => {
    onChange(opt.value);
    setSearchTerm(opt.label);
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
    if (!e.target.value) {
      onChange(''); // Clear selected value if search is cleared
    }
  };

  return (
    <div className="form-group searchable-select-wrapper" ref={wrapperRef} style={{ position: 'relative' }}>
      {label && <label>{label} {required && <span className="required" style={{ color: 'var(--danger-color, red)' }}>*</span>}</label>}
      <div className="searchable-select-input-container" style={{ position: 'relative' }}>
        <input
          type="text"
          className="form-control"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => !disabled && setIsOpen(true)}
          disabled={disabled}
          required={required && !value}
          autoComplete="off"
          style={{ paddingRight: '30px' }}
        />
        <div
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted, #888)',
            pointerEvents: 'none',
            fontSize: '12px',
          }}
        >
          <FaIcon name={isOpen ? 'chevron-up' : 'chevron-down'} />
        </div>
      </div>
      
      {isOpen && !disabled && (
        <ul
          className="searchable-select-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            background: 'white',
            border: '1px solid var(--border-color, #ddd)',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            maxHeight: '220px',
            overflowY: 'auto',
            padding: '5px 0',
            margin: '4px 0 0 0',
            listStyle: 'none',
          }}
        >
          {filteredOptions.length === 0 ? (
            <li style={{ padding: '10px 15px', color: 'var(--text-muted, #888)', fontSize: '13px' }}>
              Aucun résultat trouvé
            </li>
          ) : (
            filteredOptions.map((opt) => (
              <li key={String(opt.value)}>
                <button
                  type="button"
                  onClick={() => handleSelect(opt)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 15px',
                    border: 'none',
                    background: String(opt.value) === String(value) ? 'var(--primary-50, #e6f4fc)' : 'transparent',
                    color: String(opt.value) === String(value) ? 'var(--primary-700, #1d8fd8)' : 'var(--text-color, #333)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (String(opt.value) !== String(value)) e.currentTarget.style.background = 'var(--bg-light, #f9f9f9)';
                  }}
                  onMouseLeave={(e) => {
                    if (String(opt.value) !== String(value)) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{opt.label}</span>
                  {opt.subtitle && (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted, #888)', marginTop: '2px' }}>
                      {opt.subtitle}
                    </span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
