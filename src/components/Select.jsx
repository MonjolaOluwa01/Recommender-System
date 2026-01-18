export default function SelectField(props) {
  const { placeholder, id, options, value, onSelect, disabled } = props;

  return (
    <section role="dropdown">
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full px-3 py-2 rounded bg-zinc-900 border border-zinc-700"
      >
        <option value="">{placeholder}</option>
        {options.map((val) => (
          <option key={val} value={val}>
            {val}
          </option>
        ))}
      </select>
    </section>
  );
}
