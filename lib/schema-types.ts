export type TemplateId = '1_ballon' | '2_ballons';

export type DataField =
  | 'capteur_solaire'
  | 'ballon_haut'
  | 'ballon_bas'
  | 'retour_solaire'
  | 'ambiance'
  | null;

export type SlotConfig = {
  enabled: boolean;
  field: DataField;
  label: string;
};

export type SchemaConfig = {
  template: TemplateId;
  installation_name: string;
  show_debit: boolean;
  show_ecs: boolean;
  slots: Record<string, SlotConfig>;
};

export const TEMPLATE_SLOTS: Record<TemplateId, { key: string; defaultLabel: string; defaultField: DataField }[]> = {
  '1_ballon': [
    { key: 'capteur',    defaultLabel: 'Capteur solaire',   defaultField: 'capteur_solaire' },
    { key: 'retour',     defaultLabel: 'Retour collecteur', defaultField: 'retour_solaire'  },
    { key: 'ballon_haut', defaultLabel: 'Ballon haut',      defaultField: 'ballon_haut'     },
    { key: 'ballon_bas',  defaultLabel: 'Ballon bas',       defaultField: 'ballon_bas'      },
    { key: 'depart_ecs',  defaultLabel: 'Départ ECS',       defaultField: null              },
    { key: 'ambiance',    defaultLabel: 'Ambiance',         defaultField: 'ambiance'        },
  ],
  '2_ballons': [
    { key: 'capteur',      defaultLabel: 'Capteur solaire',   defaultField: 'capteur_solaire' },
    { key: 'retour',       defaultLabel: 'Retour collecteur', defaultField: 'retour_solaire'  },
    { key: 'ballon1_haut', defaultLabel: 'Ballon 1 haut',     defaultField: 'ballon_haut'     },
    { key: 'ballon1_bas',  defaultLabel: 'Ballon 1 bas',      defaultField: 'ballon_bas'      },
    { key: 'ballon2_haut', defaultLabel: 'Ballon 2 haut',     defaultField: null              },
    { key: 'ballon2_bas',  defaultLabel: 'Ballon 2 bas',      defaultField: null              },
    { key: 'depart_ecs',   defaultLabel: 'Départ ECS',        defaultField: null              },
    { key: 'ambiance',     defaultLabel: 'Ambiance',          defaultField: 'ambiance'        },
  ],
};

export const DATA_FIELD_OPTIONS: { value: DataField; label: string }[] = [
  { value: 'capteur_solaire', label: 'Capteur solaire'   },
  { value: 'ballon_haut',     label: 'Ballon haut'       },
  { value: 'ballon_bas',      label: 'Ballon bas'        },
  { value: 'retour_solaire',  label: 'Retour solaire'    },
  { value: 'ambiance',        label: 'Ambiance'          },
  { value: null,              label: '— Non mappé —'     },
];

export function defaultConfig(template: TemplateId): SchemaConfig {
  const slots: Record<string, SlotConfig> = {};
  for (const s of TEMPLATE_SLOTS[template]) {
    slots[s.key] = { enabled: s.defaultField !== null, field: s.defaultField, label: s.defaultLabel };
  }
  return { template, installation_name: '', show_debit: true, show_ecs: false, slots };
}
