/**
 * Liberty Field App — Form Question Definitions
 *
 * All questions from the Typeform + PDF-derived site observations.
 * Each question maps to a `question_key` in the Answer model.
 * Questions are grouped into wizard steps with collapsible sections.
 */

export type QuestionType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'file_upload'
  | 'file_upload_multi'
  | 'contact';

export interface SelectOption {
  label: string;
  value: string;
}

export interface QuestionDef {
  key: string;
  label: string;
  type: QuestionType;
  section: string;
  required: boolean;
  placeholder?: string;
  options?: SelectOption[];
  helperText?: string;
  /** If set, this question only appears when the condition is met */
  showWhen?: { key: string; isEmpty: boolean } | { key: string; equals: string };
  /** Accepted MIME types for file uploads */
  acceptedTypes?: string[];
}

// ─────────────────────────────────────────────
// STEP 1: Uploads & Documents
// ─────────────────────────────────────────────

export const STEP1_UPLOADS: QuestionDef[] = [
  {
    key: 'upload_rules_regs',
    label: 'Please upload Contractor Rules & Regs',
    type: 'file_upload',
    section: 'Documents',
    required: true,
    helperText: 'Upload the building\'s contractor rules and regulations document.',
    acceptedTypes: ['application/pdf', 'image/*'],
  },
  {
    key: 'upload_sample_coi',
    label: 'Please upload a sample COI',
    type: 'file_upload',
    section: 'Documents',
    required: true,
    helperText: 'Upload a sample Certificate of Insurance for the building.',
    acceptedTypes: ['application/pdf', 'image/*'],
  },
  {
    key: 'upload_base_drawings',
    label: 'Please upload any base building drawings or as-built plans available for this project site',
    type: 'file_upload_multi',
    section: 'Documents',
    required: true,
    helperText: 'Multiple files allowed. Upload all available plans.',
    acceptedTypes: ['application/pdf', 'image/*', 'application/dwg'],
  },
  {
    key: 'coi_requirements_text',
    label: 'If there is no sample COI to provide, you can type out any COI requirements here',
    type: 'textarea',
    section: 'Documents',
    required: false,
    placeholder: 'Type COI requirements...',
    showWhen: { key: 'upload_sample_coi', isEmpty: true },
  },
  {
    key: 'project_full_address',
    label: 'Full address of project site, including Suite #, as it should be shown on the Building Permit',
    type: 'text',
    section: 'Project Address',
    required: true,
    placeholder: '123 Main St, Suite 200, City, State ZIP',
  },
];

// ─────────────────────────────────────────────
// STEP 2: Contacts
// ─────────────────────────────────────────────

export const STEP2_CONTACTS: QuestionDef[] = [
  {
    key: 'contact_building_manager',
    label: 'Building Manager Contact',
    type: 'contact',
    section: 'Building Contacts',
    required: true,
    helperText: 'Import from phone contacts or enter manually.',
  },
  {
    key: 'contact_fire_alarm',
    label: 'Contact Info for Building\'s Fire Alarm Contractor',
    type: 'contact',
    section: 'Building Contractors',
    required: true,
  },
  {
    key: 'contact_sprinkler',
    label: 'Contact Info for Building\'s Sprinkler Contractor',
    type: 'contact',
    section: 'Building Contractors',
    required: true,
  },
  {
    key: 'contact_ems_vendor',
    label: 'Contact Info for Building\'s EMS Vendor, if applicable',
    type: 'contact',
    section: 'Building Contractors',
    required: false,
    helperText: 'Leave blank or mark N/A if not applicable.',
  },
];

// ─────────────────────────────────────────────
// STEP 3: Site & Project Questions
// ─────────────────────────────────────────────

export const STEP3_SITE_QUESTIONS: QuestionDef[] = [
  {
    key: 'salvage_items',
    label: 'If GC is required to salvage and turn over any items to the Landlord prior to demolition phase, please list below',
    type: 'textarea',
    section: 'Demolition & Salvage',
    required: true,
    placeholder: 'List items to salvage, or mark N/A...',
  },
  {
    key: 'sub_meters_required',
    label: 'Are new sub-meters required to be installed for this project?',
    type: 'select',
    section: 'Utilities',
    required: true,
    options: [
      { label: 'Yes', value: 'yes' },
      { label: 'No', value: 'no' },
      { label: 'Unknown', value: 'unknown' },
    ],
  },
  {
    key: 'new_utilities',
    label: 'Does Tenant or GC need to apply for new utilities?',
    type: 'select',
    section: 'Utilities',
    required: true,
    options: [
      { label: 'Tenant', value: 'tenant' },
      { label: 'GC', value: 'gc' },
      { label: 'Neither', value: 'neither' },
      { label: 'Unknown', value: 'unknown' },
    ],
  },
  {
    key: 'parking_restrictions',
    label: 'Any info or restrictions on contractor vehicle parking and dumpster locations during construction',
    type: 'textarea',
    section: 'Parking & Access',
    required: true,
    placeholder: 'Describe parking and dumpster restrictions...',
  },
  {
    key: 'emergency_power_circuit',
    label: 'Does the building have an emergency power circuit we can use to wire new emergency lighting to?',
    type: 'select',
    section: 'Building Structure',
    required: true,
    options: [
      { label: 'Yes', value: 'yes' },
      { label: 'No', value: 'no' },
      { label: 'Unknown', value: 'unknown' },
    ],
  },
  {
    key: 'demising_walls',
    label: 'Is Tenant/GC responsible for building new demising walls?',
    type: 'select',
    section: 'Building Structure',
    required: true,
    options: [
      { label: 'Tenant', value: 'tenant' },
      { label: 'GC', value: 'gc' },
      { label: 'Landlord', value: 'landlord' },
    ],
  },
  {
    key: 'concrete_slab_reinforcement',
    label: 'Existing concrete slab at project site is reinforced with:',
    type: 'select',
    section: 'Building Structure',
    required: true,
    options: [
      { label: 'Rebar', value: 'rebar' },
      { label: 'Wire Mesh', value: 'wire_mesh' },
      { label: 'Post-Tension', value: 'post_tension' },
      { label: 'Unknown', value: 'unknown' },
    ],
  },
  {
    key: 'occupied_space_below',
    label: 'Is there an occupied space below the suite? (For core drilling coordination purposes.)',
    type: 'select',
    section: 'Building Structure',
    required: true,
    options: [
      { label: 'Yes', value: 'yes' },
      { label: 'No', value: 'no' },
      { label: 'Unknown', value: 'unknown' },
    ],
  },
  {
    key: 'exterior_penetrations',
    label: 'If exterior penetrations are needed for any new sanitary vents, exhaust fans, etc., are we permitted to vent out the exterior wall?',
    type: 'select',
    section: 'Exterior',
    required: true,
    options: [
      { label: 'Yes', value: 'yes' },
      { label: 'No', value: 'no' },
      { label: 'Ask Landlord', value: 'ask_landlord' },
    ],
  },
  {
    key: 'required_fire_alarm_contractor',
    label: 'Is Liberty required to use the Building\'s Fire Alarm Contractor?',
    type: 'select',
    section: 'Fire & Sprinkler',
    required: true,
    options: [
      { label: 'Yes', value: 'yes' },
      { label: 'No', value: 'no' },
      { label: 'Unknown', value: 'unknown' },
    ],
  },
  {
    key: 'fire_alarm_work_scope',
    label: 'What is the Building\'s Fire Alarm Contractor needed for?',
    type: 'multiselect',
    section: 'Fire & Sprinkler',
    required: true,
    options: [
      { label: 'Monitoring', value: 'monitoring' },
      { label: 'New devices', value: 'new_devices' },
      { label: 'Reprogramming', value: 'reprogramming' },
      { label: 'Full install', value: 'full_install' },
    ],
    showWhen: { key: 'required_fire_alarm_contractor', equals: 'yes' },
  },
  {
    key: 'required_sprinkler_contractor',
    label: 'Is Liberty required to use the Building\'s Sprinkler Contractor?',
    type: 'select',
    section: 'Fire & Sprinkler',
    required: true,
    options: [
      { label: 'Yes', value: 'yes' },
      { label: 'No', value: 'no' },
      { label: 'Unknown', value: 'unknown' },
    ],
  },
  {
    key: 'additional_info',
    label: 'Please provide any additional info to the Contractor and Design Team that may impact the development of Permit Plans',
    type: 'textarea',
    section: 'Additional Notes',
    required: false,
    placeholder: 'Any additional relevant information...',
  },
];

// ─────────────────────────────────────────────
// STEP 4: Site Observations (PDF-derived)
// ─────────────────────────────────────────────

export const STEP4_OBSERVATIONS: QuestionDef[] = [
  {
    key: 'deck_height_type',
    label: 'Deck height and deck type',
    type: 'text',
    section: 'Structural',
    required: true,
    placeholder: 'e.g., 14\'6" metal pan deck',
    helperText: 'Measure from finished floor to underside of deck.',
  },
  {
    key: 'ductwork_clearance',
    label: 'Lowest point of existing ductwork (clearance height)',
    type: 'text',
    section: 'Structural',
    required: true,
    placeholder: 'e.g., 10\'2"',
  },
  {
    key: 'ibeam_clearance',
    label: 'Clearance to bottom of nearest I-beam',
    type: 'text',
    section: 'Structural',
    required: true,
    placeholder: 'e.g., 12\'8"',
  },
  {
    key: 'existing_rtus',
    label: 'Are there existing RTUs? If yes, describe/estimate size (or "unknown")',
    type: 'text',
    section: 'Mechanical',
    required: true,
    placeholder: 'e.g., 2x 5-ton RTUs on roof, or "unknown"',
  },
  {
    key: 'natural_gas_available',
    label: 'Is natural gas available in the building/suite?',
    type: 'select',
    section: 'Mechanical',
    required: true,
    options: [
      { label: 'Yes', value: 'yes' },
      { label: 'No', value: 'no' },
      { label: 'Unknown', value: 'unknown' },
    ],
  },
  {
    key: 'water_fountain',
    label: 'Is there a water fountain? If yes, where?',
    type: 'text',
    section: 'Plumbing',
    required: true,
    placeholder: 'e.g., Common hallway near elevator, or "No"',
  },
  {
    key: 'restroom_location',
    label: 'Are restrooms in common areas, in-suite, or both?',
    type: 'select',
    section: 'Plumbing',
    required: true,
    options: [
      { label: 'Common areas', value: 'common' },
      { label: 'In-suite', value: 'in_suite' },
      { label: 'Both', value: 'both' },
    ],
  },
  {
    key: 'janitor_closet',
    label: 'Is there a janitor\'s closet? If yes, where?',
    type: 'text',
    section: 'Plumbing',
    required: true,
    placeholder: 'e.g., End of hallway, 2nd floor, or "No"',
  },
  {
    key: 'sprinkler_system',
    label: 'Is the building fully sprinklered? Sprinkler room location + any access info',
    type: 'textarea',
    section: 'Fire Protection',
    required: true,
    placeholder: 'Describe sprinkler system, room location, and access details...',
  },
  {
    key: 'fire_alarm_location',
    label: 'Fire alarm system: location + any access info',
    type: 'textarea',
    section: 'Fire Protection',
    required: true,
    placeholder: 'Describe fire alarm panel location and access...',
  },
  {
    key: 'electrical_meter',
    label: 'Existing electric meter present? Approximate run length to main electrical room/service point',
    type: 'textarea',
    section: 'Electrical',
    required: true,
    placeholder: 'Describe meter location and approximate distance to main service...',
  },
  {
    key: 'tenants_below',
    label: 'What businesses/tenants are directly below the suite (if any)?',
    type: 'text',
    section: 'Neighbors',
    required: true,
    placeholder: 'e.g., Dental office, or "Ground floor / no tenant below"',
  },
  {
    key: 'water_meter_shutoff',
    label: 'Water meter present? Location of main shutoff (e.g., above ceiling/other)',
    type: 'text',
    section: 'Plumbing',
    required: true,
    placeholder: 'e.g., Above ceiling in utility closet, Room 104',
  },
  {
    key: 'parking_observations',
    label: 'Parking: options (street, garage, other) and any clearance/height limits; note restrictions',
    type: 'textarea',
    section: 'Access & Parking',
    required: true,
    placeholder: 'Describe parking options, height limits, and any restrictions...',
  },
];

// ─────────────────────────────────────────────
// All steps combined for iteration
// ─────────────────────────────────────────────

export const WIZARD_STEPS = [
  { key: 'uploads', title: 'Uploads & Documents', questions: STEP1_UPLOADS },
  { key: 'contacts', title: 'Contacts', questions: STEP2_CONTACTS },
  { key: 'site_questions', title: 'Site & Project Questions', questions: STEP3_SITE_QUESTIONS },
  { key: 'observations', title: 'Site Observations', questions: STEP4_OBSERVATIONS },
  { key: 'review', title: 'Review & Submit', questions: [] },
] as const;

/** Get all unique section names for a given step */
export function getSections(questions: QuestionDef[]): string[] {
  const seen = new Set<string>();
  return questions.reduce<string[]>((acc, q) => {
    if (!seen.has(q.section)) {
      seen.add(q.section);
      acc.push(q.section);
    }
    return acc;
  }, []);
}

/** Get questions for a specific section within a step */
export function getQuestionsForSection(
  questions: QuestionDef[],
  section: string,
): QuestionDef[] {
  return questions.filter((q) => q.section === section);
}
