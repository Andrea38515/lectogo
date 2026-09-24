import "./SearchBar.css";

function SearchBar({
  value = "",
  onChange,
  placeholder = "Buscar por palabra clave...",
  onClear,
}) {
  const handleClear = () => {
    if (onClear) {
      onClear();
    } else if (onChange) {
      onChange("");
    }
  };

  return (
    <div className="search-bar">
      <span className="search-bar-icon" aria-hidden="true">
        🔎
      </span>

      <input
        type="text"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        aria-label="Buscar"
      />

      {value && (
        <button
          type="button"
          className="search-bar-clear"
          onClick={handleClear}
          aria-label="Limpiar búsqueda"
        >
          ×
        </button>
      )}
    </div>
  );
}

export default SearchBar;

