interface MatrixDimensionFieldProps {
  label: string;
  listId: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MatrixDimensionField({
  label,
  listId,
  value,
  options,
  onChange,
  disabled,
  placeholder,
}: MatrixDimensionFieldProps) {
  return (
    <label className="matrix-dimension-field">
      <span>{label}</span>
      <input
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
      />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </label>
  );
}
