import { ABILITY_META, type AbilityId } from './abilityMeta';
import { UI_TEXT } from '../../data/localization';

interface Props {
  id: AbilityId;
  cost: number;
  locked: boolean;
  disabled: boolean;
  selected: boolean;
  /** доступные заряды для Обмена */
  swapCharges?: number;
  onClick: () => void;
}

export function AbilityButton({ id, locked, disabled, selected, swapCharges, onClick }: Props) {
  const meta = ABILITY_META[id];
  const name = UI_TEXT.abilities[id];
  const hint = locked
    ? 'Заряд Обмена ещё не получен: потрать 6 очков навыков'
    : UI_TEXT.abilityHints[id];
  const isSwap = id === 'swap';
  const costLabel = isSwap
    ? swapCharges && swapCharges > 0
      ? `${meta.icon === '⇄' ? '' : ''}заряд: ${swapCharges}`
      : 'нет заряда'
    : `${meta.cost}`;
  return (
    <button
      className={`ability-btn${selected ? ' selected' : ''}${locked ? ' locked' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={`${name}. ${hint}`}
      title={hint}
    >
      <span className="icon" aria-hidden>
        {locked ? '🔒' : meta.icon}
      </span>
      <span className="name">{name}</span>
      <span className="cost">{locked ? UI_TEXT.locked : costLabel}</span>
    </button>
  );
}
