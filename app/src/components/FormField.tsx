export function TextField({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm text-ps-ink-2 mb-1">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ps-green"
      />
    </div>
  );
}

export function SelectField({
  label,
  name,
  options,
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="block text-sm text-ps-ink-2 mb-1">{label}</label>
      <select
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-ps-sm border border-ps-navy/15 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ps-green"
      >
        <option value="">Selecione...</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function CheckboxField({
  label,
  name,
  defaultChecked,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-ps-ink-2">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="rounded" />
      {label}
    </label>
  );
}
