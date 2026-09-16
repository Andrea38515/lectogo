import "./SearchBar.css";

const SearchBar = ({
  value = "",
  onChange,
  placeholder = "Buscar...",
  onClear,
  disabled = false,
}) => {
  const handleChange = (event) => {
    onChange?.(event.target.value);
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else {
      onChange?.("");
    }
  };

  return (
    <div className="search-bar">
      <span className="search-bar__icon" aria-hidden="true">
        🔎
      </span>

      <input
        type="text"
        className="search-bar__input"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        aria-label="Buscar"
      />

      {value && (
        <button
          type="button"
          className="search-bar__clear"
          onClick={handleClear}
          disabled={disabled}
          aria-label="Limpiar búsqueda"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default SearchBar;