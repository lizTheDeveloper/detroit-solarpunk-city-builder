import { useGame } from '@/state/store';
import { EXPENSE_LINES, REVENUE_LINES, totalAnnualExpenses, totalAnnualRevenue } from '@/data/content/budget-lines';
import { formatBudget } from '@/ui/format';

function BudgetLine({ name, annual, monthly, description }: {
  name: string;
  annual: number;
  monthly: number;
  description: string;
}) {
  return (
    <div className="budget-line" title={description}>
      <span className="budget-line__name">{name}</span>
      <span className="budget-line__monthly">{formatBudget(monthly)}/mo</span>
      <span className="budget-line__annual">{formatBudget(annual)}/yr</span>
    </div>
  );
}

function CategoryGroup({ label, lines, color }: {
  label: string;
  lines: typeof EXPENSE_LINES;
  color: string;
}) {
  const total = lines.reduce((s, l) => s + l.annualAmount, 0);
  return (
    <div className="budget-category">
      <div className="budget-category__header" style={{ borderLeftColor: color }}>
        <span className="budget-category__label">{label}</span>
        <span className="budget-category__total">{formatBudget(total)}/yr</span>
      </div>
      {lines.map(l => (
        <BudgetLine
          key={l.id}
          name={l.name}
          annual={l.annualAmount}
          monthly={Math.round(l.annualAmount / 12 * 10) / 10}
          description={l.description}
        />
      ))}
    </div>
  );
}

export default function BudgetPanel() {
  const { state } = useGame();

  const annualExpenses = totalAnnualExpenses();
  const annualRevenue = totalAnnualRevenue();
  const monthlyExpenses = Math.round(annualExpenses / 12 * 10) / 10;
  const monthlyRevenue = Math.round(annualRevenue / 12 * 10) / 10;

  const projectCosts = Object.values(state.tiles)
    .flatMap(t => t.activeProjects)
    .reduce((sum, p) => sum + (p.cost / p.duration), 0);

  const totalMonthlyOut = monthlyExpenses + projectCosts;
  const monthlySurplus = monthlyRevenue - totalMonthlyOut;
  const annualSurplus = monthlySurplus * 12;

  const monthsRemaining = totalMonthlyOut > 0 ? Math.floor(state.meters.budget / totalMonthlyOut) : 999;

  const safetyCategories = EXPENSE_LINES.filter(l => l.category === 'public-safety');
  const infraCategories = EXPENSE_LINES.filter(l => l.category === 'infrastructure');
  const serviceCategories = EXPENSE_LINES.filter(l => l.category === 'services');
  const devCategories = EXPENSE_LINES.filter(l => l.category === 'development');
  const adminCategories = EXPENSE_LINES.filter(l => l.category === 'administration');

  return (
    <div className="panel budget-panel">
      <h2 className="panel-title">City Budget — General Fund</h2>

      <div className="budget-summary">
        <div className="budget-summary__item">
          <span className="budget-summary__label">Fund Balance</span>
          <span className="budget-summary__value">{formatBudget(state.meters.budget)}</span>
        </div>
        <div className="budget-summary__item">
          <span className="budget-summary__label">Monthly Revenue</span>
          <span className="budget-summary__value budget-summary__value--positive">+{formatBudget(monthlyRevenue)}</span>
        </div>
        <div className="budget-summary__item">
          <span className="budget-summary__label">Monthly Expenses</span>
          <span className="budget-summary__value budget-summary__value--negative">-{formatBudget(totalMonthlyOut)}</span>
        </div>
        <div className={`budget-summary__item budget-summary__item--highlight ${monthlySurplus >= 0 ? 'budget-summary__item--surplus' : 'budget-summary__item--deficit'}`}>
          <span className="budget-summary__label">Monthly {monthlySurplus >= 0 ? 'Surplus' : 'Deficit'}</span>
          <span className="budget-summary__value">
            {monthlySurplus >= 0 ? '+' : ''}{formatBudget(monthlySurplus)}
          </span>
        </div>
      </div>

      {projectCosts > 0 && (
        <div className="budget-projects-note">
          Active projects: {formatBudget(projectCosts)}/mo across {Object.values(state.tiles).flatMap(t => t.activeProjects).length} projects
        </div>
      )}

      <div className="budget-projection">
        <h3 className="budget-section-title">12-Month Projection</h3>
        <div className="budget-projection__bars">
          {Array.from({ length: 12 }, (_, i) => {
            const projected = state.meters.budget + monthlySurplus * (i + 1);
            const pct = Math.max(0, Math.min(100, (projected / 2000) * 100));
            const danger = projected < 0;
            return (
              <div key={i} className="budget-projection__month">
                <div className="budget-projection__bar-track">
                  <div
                    className={`budget-projection__bar-fill ${danger ? 'budget-projection__bar-fill--danger' : ''}`}
                    style={{ height: `${pct}%` }}
                  />
                </div>
                <span className="budget-projection__label">M{i + 1}</span>
              </div>
            );
          })}
        </div>
        <div className="budget-projection__summary">
          {monthlySurplus >= 0
            ? `Balanced — projecting ${formatBudget(annualSurplus)} annual surplus`
            : monthsRemaining > 12
              ? `Deficit of ${formatBudget(Math.abs(annualSurplus))}/yr — sustainable for ${monthsRemaining} months`
              : `Running out of funds in ~${monthsRemaining} months at current spend`
          }
        </div>
      </div>

      <div className="budget-details">
        <div className="budget-column">
          <h3 className="budget-section-title">Expenses — {formatBudget(annualExpenses)}/yr</h3>
          <CategoryGroup label="Public Safety" lines={safetyCategories} color="#f87171" />
          <CategoryGroup label="Infrastructure" lines={infraCategories} color="#60a5fa" />
          <CategoryGroup label="City Services" lines={serviceCategories} color="#4ade80" />
          <CategoryGroup label="Development" lines={devCategories} color="#fbbf24" />
          <CategoryGroup label="Administration & Debt" lines={adminCategories} color="#a78bfa" />
        </div>

        <div className="budget-column">
          <h3 className="budget-section-title">Revenue — {formatBudget(annualRevenue)}/yr</h3>
          {REVENUE_LINES.map(l => (
            <BudgetLine
              key={l.id}
              name={l.name}
              annual={l.annualAmount}
              monthly={Math.round(l.annualAmount / 12 * 10) / 10}
              description={l.description}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
