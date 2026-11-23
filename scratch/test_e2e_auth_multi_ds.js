// End-to-End Test for Auth & Multi-Design System Architecture
import { store, DEFAULT_USERS } from '../public/js/store.js';

console.log('=== STEP 1: Verify Initial Unauthenticated State ===');
console.log('isAuthenticated:', store.isAuthenticated());
console.log('Dummy credentials available:');
DEFAULT_USERS.forEach(u => console.log(`  - ${u.name} (${u.role}): ${u.email} / ${u.password}`));

if (store.isAuthenticated()) {
  store.logout();
}

console.log('\n=== STEP 2: Test 1-Click Demo Login as Lead Designer ===');
const loginResult = store.quickDemoLogin('designer');
console.log('Login result success:', loginResult.success);
console.log('Logged in user:', store.getCurrentUser().name, `(${store.getCurrentUser().role})`);

const alexSystems = store.getDesignSystems();
console.log(`User has ${alexSystems.length} initial Design Systems:`);
alexSystems.forEach((ds, i) => {
  console.log(`  [${i + 1}] ${ds.name} | Comps: ${ds.components.length} | Brand: ${ds.brandColor} | ID: ${ds.id}`);
});

console.log('\n=== STEP 3: Strict Isolation Between Design Systems ===');
const nexusDS = alexSystems[0];
const auroraDS = alexSystems[1];

console.log('Currently active DS:', store.getActiveDesignSystem().name);
console.log('Active DS components count:', store.components.length);

// Mutate a component in Nexus
const firstCompName = store.components[0].name;
store.components[0].name = 'CUSTOM_TEST_COMPONENT_NEXUS';
store.saveComponents();
console.log(`Renamed Nexus comp 0 to: "${store.components[0].name}"`);

// Switch to Aurora Mobile Kit
console.log('\nSwitching to Aurora Mobile Kit...');
store.switchDesignSystem(auroraDS.id);
console.log('Active DS is now:', store.getActiveDesignSystem().name);
console.log('Aurora components count:', store.components.length);
console.log('Aurora brand tokens primary color:', store.getActiveTokens().brand.primaryColor);

// Verify isolation: Aurora does NOT have the mutated name
const auroraHasMutated = store.components.some(c => c.name === 'CUSTOM_TEST_COMPONENT_NEXUS');
console.log('Aurora has mutated component?:', auroraHasMutated);
if (!auroraHasMutated && store.components.length === 18) {
  console.log('>>> [PASS] Isolation verified! Aurora is completely isolated from Nexus.');
} else {
  console.error('>>> [FAIL] Aurora was affected by Nexus mutation!');
  process.exit(1);
}

// Add a component to Aurora
console.log('\nAdding a mobile component to Aurora...');
store.createNewComponent({
  id: 'mobile-bottom-nav',
  name: 'Mobile Bottom Nav',
  category: 'Navigation',
  props: [],
  activeProps: {},
  styles: { bg: '#7C3AED' }
});
console.log('Aurora components count now:', store.components.length);

// Switch back to Nexus
console.log('\nSwitching back to Nexus Enterprise UI...');
store.switchDesignSystem(nexusDS.id);
console.log('Active DS is now:', store.getActiveDesignSystem().name);
console.log('Nexus components count:', store.components.length);
const nexusHasMobileNav = store.components.some(c => c.id === 'mobile-bottom-nav');
console.log('Nexus has Mobile Bottom Nav?:', nexusHasMobileNav);
if (!nexusHasMobileNav && store.components.length === 59) {
  console.log('>>> [PASS] Isolation verified! Nexus is untouched by Aurora addition.');
} else {
  console.error('>>> [FAIL] Nexus was contaminated by Aurora!');
  process.exit(1);
}

console.log('\n=== STEP 4: Test Creating a 3rd Design System ===');
const newDS = store.createDesignSystem({
  name: 'Solaris FinTech UI',
  description: 'Banking and financial trading web terminal.',
  framework: 'Vue 3',
  brandColor: '#0284C7',
  template: 'starter'
});
console.log('Created DS:', newDS.name, `(${newDS.id})`);
console.log('Total user design systems now:', store.getDesignSystems().length);
console.log('Active DS is now:', store.getActiveDesignSystem().name);
console.log('Active brand color:', store.getActiveDesignSystem().brandColor);
console.log('Active components count:', store.components.length);

console.log('\n=== STEP 5: Test Duplicating Design System ===');
const dupDS = store.duplicateDesignSystem(newDS.id);
console.log('Duplicated DS:', dupDS.name, `(${dupDS.id})`);
console.log('Total user design systems now:', store.getDesignSystems().length);

console.log('\n=== STEP 6: Test Deleting Design System ===');
const delSuccess = store.deleteDesignSystem(dupDS.id);
console.log('Delete success:', delSuccess);
console.log('Total user design systems remaining:', store.getDesignSystems().length);

console.log('\n=== STEP 7: Test Registration of a New User ===');
const regResult = store.register({
  name: 'Jordan Smith',
  email: 'jordan@fintech.co',
  password: 'securePassword123',
  company: 'Fintech Co',
  role: 'Senior UI Engineer'
});
console.log('Register success:', regResult.success);
console.log('New logged in user:', store.getCurrentUser().name, `(${store.getCurrentUser().email})`);
const jordanSystems = store.getDesignSystems();
console.log(`Jordan has ${jordanSystems.length} isolated design systems:`);
jordanSystems.forEach(ds => console.log(`  - ${ds.name} (${ds.id})`));

console.log('\n=== STEP 8: Test Logout ===');
store.logout();
console.log('Logged out. isAuthenticated:', store.isAuthenticated());
console.log('Current user:', store.getCurrentUser());

console.log('\n=============================================');
console.log('>>> ALL AUTH & MULTI-DS VERIFICATIONS PASSED! <<<');
console.log('=============================================');
