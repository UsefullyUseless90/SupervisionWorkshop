INSERT INTO locations (code, name) VALUES
  ('OP10',   'Chiffrage Appro'),
  ('OP30',   'SST'),
  ('OP110',  'Prog Prepa Chaudro'),
  ('OP120',  'Prog Prepa Usinage'),
  ('OP210',  'Decoupe Tolerie'),
  ('OP220',  'Pliage'),
  ('OP300',  'Usinage'),
  ('OP400',  'Soudage'),
  ('OP500',  'Peinture'),
  ('OP600',  'Montage Meca'),
  ('OP700',  'Montage Elec'),
  ('OP800',  'Fabrication Additive'),
  ('OP900',  'Qualité'),
  ('OP1000', 'Expedition')
ON CONFLICT (code) DO NOTHING;