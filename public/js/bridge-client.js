
// Component-specific variants generator (Requirement 19 & 21)
export function getComponentSpecificVariants(component) {
  if (!component) return [];
  const id = (component.id || '').toLowerCase();
  const name = (component.name || '').toLowerCase();
  const variants = [];

  // 1. Checkbox
  if (id.includes('checkbox') || name.includes('checkbox')) {
    const states = ['Rest', 'Hover', 'Focus', 'Disabled'];
    const checkVals = [
      { val: 'true', label: 'Checked', checked: true },
      { val: 'false', label: 'Unchecked', checked: false },
      { val: 'indeterminate', label: 'Indeterminate', checked: 'indeterminate' }
    ];
    for (const cv of checkVals) {
      for (const st of states) {
        let bg = '#FFFFFF';
        let border = '#D1D5DB';
        let text = '#1F2937';
        if (cv.val === 'true' || cv.val === 'indeterminate') {
          bg = (st === 'Hover') ? '#9A3412' : '#C2410C';
          border = bg;
        } else if (st === 'Hover') {
          border = '#9CA3AF';
          bg = '#F9FAFB';
        } else if (st === 'Focus') {
          border = '#C2410C';
        } else if (st === 'Disabled') {
          bg = '#F3F4F6';
          border = '#E5E7EB';
          text = '#9CA3AF';
        }
        variants.push({
          name: `Checked=${cv.val}, State=${st}`,
          compType: 'checkbox',
          properties: {
            checked: cv.checked,
            Checked: cv.val,
            state: st,
            State: st,
            label: component.activeProps?.label || 'Checkbox option',
            compType: 'checkbox'
          },
          styles: {
            bg,
            border,
            text,
            cornerRadius: 4,
            borderWidth: 1.5,
            padding: { top: 4, right: 8, bottom: 4, left: 4 },
            gap: 8,
            fontSize: 14
          }
        });
      }
    }
    return variants;
  }

  // 2. Switch / Toggle
  if (id.includes('switch') || id.includes('toggle') || name.includes('switch') || name.includes('toggle')) {
    const states = ['Rest', 'Hover', 'Disabled'];
    const checkVals = [
      { val: 'true', label: 'On', checked: true },
      { val: 'false', label: 'Off', checked: false }
    ];
    for (const cv of checkVals) {
      for (const st of states) {
        let bg = cv.val === 'true' ? '#C2410C' : '#E5E7EB';
        if (st === 'Hover') {
          bg = cv.val === 'true' ? '#9A3412' : '#D1D5DB';
        } else if (st === 'Disabled') {
          bg = cv.val === 'true' ? '#FDBA74' : '#F3F4F6';
        }
        variants.push({
          name: `Checked=${cv.val}, State=${st}`,
          compType: 'switch',
          properties: {
            checked: cv.checked,
            Checked: cv.val,
            state: st,
            State: st,
            label: component.activeProps?.label || 'Toggle switch',
            compType: 'switch'
          },
          styles: {
            bg,
            border: 'transparent',
            text: '#1F2937',
            cornerRadius: 999,
            borderWidth: 0,
            padding: { top: 2, right: 2, bottom: 2, left: 2 },
            gap: 10,
            fontSize: 14
          }
        });
      }
    }
    return variants;
  }

  // 3. Radio
  if (id.includes('radio') || name.includes('radio')) {
    const states = ['Rest', 'Hover', 'Disabled'];
    const selectVals = [
      { val: 'true', label: 'Selected', selected: true },
      { val: 'false', label: 'Unselected', selected: false }
    ];
    for (const sv of selectVals) {
      for (const st of states) {
        let border = sv.val === 'true' ? '#C2410C' : '#D1D5DB';
        let bg = '#FFFFFF';
        let dot = sv.val === 'true' ? '#C2410C' : 'transparent';
        if (st === 'Hover') border = '#9A3412';
        if (st === 'Disabled') {
          border = '#E5E7EB';
          dot = sv.val === 'true' ? '#9CA3AF' : 'transparent';
        }
        variants.push({
          name: `Selected=${sv.val}, State=${st}`,
          compType: 'radio',
          properties: {
            selected: sv.selected,
            Selected: sv.val,
            state: st,
            State: st,
            label: component.activeProps?.label || 'Radio option',
            compType: 'radio'
          },
          styles: {
            bg,
            border,
            text: dot,
            cornerRadius: 999,
            borderWidth: 1.5,
            padding: { top: 4, right: 8, bottom: 4, left: 4 },
            gap: 8,
            fontSize: 14
          }
        });
      }
    }
    return variants;
  }

  // 4. Input field / Textarea / Date input
  if (id.includes('input') || id.includes('textarea') || name.includes('input') || name.includes('textarea')) {
    const states = ['Default', 'Focus', 'Filled', 'Error', 'Disabled'];
    const sizes = ['sm', 'md', 'lg'];
    for (const sz of sizes) {
      for (const st of states) {
        let border = '#D1D5DB';
        let bg = '#FFFFFF';
        let text = '#1F2937';
        let shadow = 'none';
        if (st === 'Focus') {
          border = '#C2410C';
          shadow = '0 0 0 3px rgba(194,65,12,0.15)';
        } else if (st === 'Error') {
          border = '#EF4444';
          shadow = '0 0 0 3px rgba(239,68,68,0.15)';
        } else if (st === 'Disabled') {
          bg = '#F3F4F6';
          border = '#E5E7EB';
          text = '#9CA3AF';
        }
        variants.push({
          name: `Size=${sz}, State=${st}`,
          compType: 'input',
          properties: {
            size: sz,
            Size: sz,
            state: st,
            State: st,
            label: component.activeProps?.label || 'Input Field',
            placeholder: st === 'Filled' ? 'John Doe' : 'Enter value...',
            compType: 'input'
          },
          styles: {
            bg,
            border,
            text,
            shadow,
            cornerRadius: sz === 'sm' ? 4 : (sz === 'lg' ? 8 : 6),
            borderWidth: 1,
            padding: sz === 'sm' ? { top: 6, right: 10, bottom: 6, left: 10 } : (sz === 'lg' ? { top: 12, right: 16, bottom: 12, left: 16 } : { top: 8, right: 12, bottom: 8, left: 12 }),
            gap: 8,
            fontSize: sz === 'sm' ? 12 : (sz === 'lg' ? 15 : 14)
          }
        });
      }
    }
    return variants;
  }

  // 5. Dialog / Modal / Drawer
  if (id.includes('modal') || id.includes('dialog') || id.includes('drawer') || name.includes('modal') || name.includes('dialog')) {
    const types = ['Standard', 'Confirmation', 'Destructive'];
    const sizes = ['sm', 'md', 'lg'];
    for (const sz of sizes) {
      for (const t of types) {
        variants.push({
          name: `Type=${t}, Size=${sz}`,
          compType: 'modal',
          properties: {
            type: t,
            Type: t,
            size: sz,
            Size: sz,
            title: `${t} Modal`,
            compType: 'modal'
          },
          styles: {
            bg: '#FFFFFF',
            border: '#E5E7EB',
            text: '#111827',
            shadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
            cornerRadius: 12,
            borderWidth: 1,
            padding: { top: 16, right: 16, bottom: 16, left: 16 },
            gap: 12,
            fontSize: 14
          }
        });
      }
    }
    return variants;
  }

  // 6. Table
  if (id.includes('table') || name.includes('table')) {
    const densities = ['Compact', 'Default', 'Relaxed'];
    const borderedVals = ['True', 'False'];
    for (const bv of borderedVals) {
      for (const d of densities) {
        variants.push({
          name: `Density=${d}, Bordered=${bv}`,
          compType: 'table',
          properties: {
            density: d,
            Density: d,
            bordered: bv === 'True',
            Bordered: bv,
            compType: 'table'
          },
          styles: {
            bg: '#FFFFFF',
            border: bv === 'True' ? '#E5E7EB' : 'transparent',
            text: '#1F2937',
            cornerRadius: 8,
            borderWidth: bv === 'True' ? 1 : 0,
            padding: d === 'Compact' ? { top: 6, right: 10, bottom: 6, left: 10 } : (d === 'Relaxed' ? { top: 14, right: 16, bottom: 14, left: 16 } : { top: 10, right: 12, bottom: 10, left: 12 }),
            gap: 8,
            fontSize: 13
          }
        });
      }
    }
    return variants;
  }

  // 7. Avatar
  if (id.includes('avatar') || name.includes('avatar')) {
    const sizes = ['sm', 'md', 'lg'];
    const statuses = ['Online', 'Offline', 'Busy'];
    for (const sz of sizes) {
      for (const st of statuses) {
        variants.push({
          name: `Size=${sz}, Status=${st}`,
          compType: 'avatar',
          properties: {
            size: sz,
            Size: sz,
            status: st,
            Status: st,
            initials: 'AJ',
            compType: 'avatar'
          },
          styles: {
            bg: '#C2410C',
            border: '#FFFFFF',
            text: '#FFFFFF',
            cornerRadius: 999,
            borderWidth: 2,
            padding: { top: 6, right: 6, bottom: 6, left: 6 },
            gap: 4,
            fontSize: sz === 'sm' ? 11 : (sz === 'lg' ? 16 : 13)
          }
        });
      }
    }
    return variants;
  }

  // 8. Badge
  if (id.includes('badge') || name.includes('badge')) {
    const badgeVariants = [
      { name: 'Primary', bg: '#FFEDD5', text: '#9A3412', border: '#FDBA74' },
      { name: 'Success', bg: '#DCFCE7', text: '#15803D', border: '#86EFAC' },
      { name: 'Warning', bg: '#FEF9C3', text: '#A16207', border: '#FDE047' },
      { name: 'Danger', bg: '#FEE2E2', text: '#B91C1C', border: '#FCA5A5' },
      { name: 'Neutral', bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' }
    ];
    const sizes = ['sm', 'md'];
    for (const sz of sizes) {
      for (const bv of badgeVariants) {
        variants.push({
          name: `Variant=${bv.name}, Size=${sz}`,
          compType: 'badge',
          properties: {
            variant: bv.name,
            Variant: bv.name,
            size: sz,
            Size: sz,
            label: bv.name,
            compType: 'badge'
          },
          styles: {
            bg: bv.bg,
            text: bv.text,
            border: bv.border,
            cornerRadius: 999,
            borderWidth: 1,
            padding: sz === 'sm' ? { top: 2, right: 6, bottom: 2, left: 6 } : { top: 4, right: 10, bottom: 4, left: 10 },
            gap: 4,
            fontSize: sz === 'sm' ? 11 : 12
          }
        });
      }
    }
    return variants;
  }

  // 9. Toast / Notification
  if (id.includes('toast') || id.includes('notification') || name.includes('toast')) {
    const types = [
      { name: 'Info', bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
      { name: 'Success', bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
      { name: 'Warning', bg: '#FEFCE8', text: '#A16207', border: '#FEF08A' },
      { name: 'Error', bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' }
    ];
    const states = ['Rest', 'Hover'];
    for (const t of types) {
      for (const st of states) {
        variants.push({
          name: `Type=${t.name}, State=${st}`,
          compType: 'toast',
          properties: {
            type: t.name,
            Type: t.name,
            state: st,
            State: st,
            message: `${t.name} notification`,
            compType: 'toast'
          },
          styles: {
            bg: t.bg,
            border: t.border,
            text: t.text,
            shadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            cornerRadius: 8,
            borderWidth: 1,
            padding: { top: 10, right: 14, bottom: 10, left: 14 },
            gap: 8,
            fontSize: 13
          }
        });
      }
    }
    return variants;
  }

  // 10. Tab
  if (id.includes('tab') || name.includes('tab')) {
    const states = ['Rest', 'Hover', 'Disabled'];
    const activeVals = ['True', 'False'];
    for (const av of activeVals) {
      for (const st of states) {
        const isActive = av === 'True';
        variants.push({
          name: `Active=${av}, State=${st}`,
          compType: 'tab',
          properties: {
            active: isActive,
            Active: av,
            state: st,
            State: st,
            label: isActive ? 'Active Tab' : 'Tab Item',
            compType: 'tab'
          },
          styles: {
            bg: 'transparent',
            border: isActive ? '#C2410C' : 'transparent',
            text: isActive ? '#C2410C' : (st === 'Hover' ? '#111827' : '#6B7280'),
            cornerRadius: 0,
            borderWidth: isActive ? 2 : 0,
            padding: { top: 8, right: 14, bottom: 8, left: 14 },
            gap: 6,
            fontSize: 14
          }
        });
      }
    }
    return variants;
  }

  // 11. Card
  if (id.includes('card') || name.includes('card')) {
    const cardVariants = [
      { name: 'Elevated', bg: '#FFFFFF', border: 'transparent', shadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
      { name: 'Outlined', bg: '#FFFFFF', border: '#E5E7EB', shadow: 'none' },
      { name: 'Filled', bg: '#F9FAFB', border: '#F3F4F6', shadow: 'none' }
    ];
    const states = ['Rest', 'Hover'];
    for (const cv of cardVariants) {
      for (const st of states) {
        variants.push({
          name: `Variant=${cv.name}, State=${st}`,
          compType: 'card',
          properties: {
            variant: cv.name,
            Variant: cv.name,
            state: st,
            State: st,
            title: `${cv.name} Card`,
            compType: 'card'
          },
          styles: {
            bg: cv.bg,
            border: cv.border,
            text: '#1F2937',
            shadow: st === 'Hover' ? '0 10px 15px -3px rgba(0,0,0,0.1)' : cv.shadow,
            cornerRadius: 10,
            borderWidth: cv.border !== 'transparent' ? 1 : 0,
            padding: { top: 14, right: 16, bottom: 14, left: 16 },
            gap: 10,
            fontSize: 14
          }
        });
      }
    }
    return variants;
  }

  // 12. Filter Chip / Chip
  if (id.includes('chip') || name.includes('chip')) {
    const states = ['Rest', 'Focus', 'Hover', 'Press'];
    const showIcons = [false, true];
    for (const hasIcon of showIcons) {
      for (const st of states) {
        let cellStyle = { bg: '#F3F4F6', text: '#1F2937', border: '#E5E7EB', shadow: 'none' };
        if (st === 'Focus') cellStyle = { bg: '#F9FAFB', text: '#111827', border: '#C2410C', shadow: '0 0 0 3px rgba(194,65,12,0.25)' };
        else if (st === 'Hover') cellStyle = { bg: '#E5E7EB', text: '#111827', border: '#D1D5DB', shadow: 'none' };
        else if (st === 'Press') cellStyle = { bg: '#D1D5DB', text: '#111827', border: '#9CA3AF', shadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' };

        variants.push({
          name: `State=${st}, Show icon=${hasIcon ? 'True' : 'False'}`,
          compType: 'chip',
          properties: {
            state: st,
            State: st,
            showIcon: hasIcon,
            'Show icon': hasIcon,
            label: component.activeProps?.label || 'Chip',
            compType: 'chip'
          },
          styles: {
            ...cellStyle,
            padding: { top: 6, right: 12, bottom: 6, left: 12 },
            gap: 6,
            cornerRadius: 999,
            borderWidth: 1,
            fontSize: 13
          }
        });
      }
    }
    return variants;
  }

  // 13. Dropdown / Menu
  if (id.includes('dropdown') || id.includes('select') || id.includes('menu') || name.includes('dropdown') || name.includes('menu')) {
    const states = ['Closed', 'Open'];
    const sizes = ['sm', 'md'];
    for (const sz of sizes) {
      for (const st of states) {
        variants.push({
          name: `State=${st}, Size=${sz}`,
          compType: 'dropdown',
          properties: {
            state: st,
            State: st,
            size: sz,
            Size: sz,
            label: component.activeProps?.label || 'Select option',
            compType: 'dropdown'
          },
          styles: {
            bg: '#FFFFFF',
            border: st === 'Open' ? '#C2410C' : '#D1D5DB',
            text: '#1F2937',
            shadow: st === 'Open' ? '0 0 0 3px rgba(194,65,12,0.2)' : 'none',
            cornerRadius: 6,
            borderWidth: 1,
            padding: { top: 8, right: 12, bottom: 8, left: 12 },
            gap: 8,
            fontSize: sz === 'sm' ? 12 : 14
          }
        });
      }
    }
    return variants;
  }

  // 14. Pagination
  if (id.includes('pagination') || name.includes('pagination')) {
    const variantsList = ['Numbered', 'Simple'];
    const sizes = ['sm', 'md'];
    for (const sz of sizes) {
      for (const v of variantsList) {
        variants.push({
          name: `Variant=${v}, Size=${sz}`,
          compType: 'pagination',
          properties: {
            variant: v,
            Variant: v,
            size: sz,
            Size: sz,
            compType: 'pagination'
          },
          styles: {
            bg: '#FFFFFF',
            border: '#E5E7EB',
            text: '#1F2937',
            cornerRadius: 6,
            borderWidth: 1,
            padding: { top: 6, right: 10, bottom: 6, left: 10 },
            gap: 4,
            fontSize: sz === 'sm' ? 12 : 14
          }
        });
      }
    }
    return variants;
  }

  // 15. Default: Button / Compact button / Action bar / Generic interactive
  const btnVariants = [
    { name: 'Primary', bg: '#C2410C', text: '#FFFFFF', border: '#9A3412' },
    { name: 'Secondary', bg: '#F3F4F6', text: '#1F2937', border: '#E5E7EB' },
    { name: 'Outline', bg: '#FFFFFF', text: '#C2410C', border: '#C2410C' },
    { name: 'Ghost', bg: 'transparent', text: '#C2410C', border: 'transparent' },
    { name: 'Danger', bg: '#DC2626', text: '#FFFFFF', border: '#B91C1C' }
  ];
  const btnStates = ['Rest', 'Hover', 'Focus', 'Disabled'];
  const btnSizes = ['sm', 'md', 'lg'];

  for (const sz of btnSizes) {
    for (const v of btnVariants) {
      for (const st of btnStates) {
        let bg = v.bg;
        let text = v.text;
        let border = v.border;
        let shadow = 'none';

        if (st === 'Hover') {
          if (v.name === 'Primary') bg = '#9A3412';
          else if (v.name === 'Secondary') bg = '#E5E7EB';
          else if (v.name === 'Outline') bg = '#FFF7ED';
          else if (v.name === 'Ghost') bg = '#FFF7ED';
          else if (v.name === 'Danger') bg = '#B91C1C';
        } else if (st === 'Focus') {
          shadow = '0 0 0 3px rgba(194,65,12,0.35)';
        } else if (st === 'Disabled') {
          bg = '#F3F4F6';
          text = '#9CA3AF';
          border = '#E5E7EB';
        }

        variants.push({
          name: `Variant=${v.name}, State=${st}, Size=${sz}`,
          compType: 'button',
          properties: {
            variant: v.name,
            Variant: v.name,
            state: st,
            State: st,
            size: sz,
            Size: sz,
            label: component.activeProps?.label || component.name,
            compType: 'button'
          },
          styles: {
            bg,
            text,
            border,
            shadow,
            cornerRadius: sz === 'sm' ? 6 : (sz === 'lg' ? 10 : 8),
            borderWidth: 1,
            padding: sz === 'sm' ? { top: 6, right: 12, bottom: 6, left: 12 } : (sz === 'lg' ? { top: 12, right: 20, bottom: 12, left: 20 } : { top: 8, right: 16, bottom: 8, left: 16 }),
            gap: 8,
            fontSize: sz === 'sm' ? 12 : (sz === 'lg' ? 16 : 14)
          }
        });
      }
    }
  }
  return variants;
}

// AI Design System Creator - Figma Desktop Bridge Client
import { store } from './store.js';

class FigmaBridgeClient {
  constructor() {
    this.ws = null;
    this.sse = null;
    this.connected = false;
    this.reconnectTimer = null;
    this.bridgeUrl = (typeof window !== 'undefined' && window.location.origin && window.location.protocol.startsWith('http'))
      ? window.location.origin 
      : 'http://localhost:9250';
    this.wsUrl = this.bridgeUrl.replace(/^http/, 'ws');
    this.syncHistory = [];
    
    // Auto initialize connection
    this.init();
  }

  init() {
    this.connectSSE();
    this.connectWebSocket();
    this.startHealthPolling();
  }

  connectSSE() {
    try {
      if (this.sse) this.sse.close();
      this.sse = new EventSource(`${this.bridgeUrl}/api/figma/events`);

      this.sse.onopen = () => {
        this.connected = true;
        store.setBridgeStatus({ connected: true, clientsCount: 1 });
      };

      this.sse.addEventListener('FIGMA_ACK', (event) => {
        try {
          const data = JSON.parse(event.data);
          this.log(`✓ Figma Canvas synced: ${data.componentName} (${data.variantCount || 0} variants created)`, 'success');
          store.setBridgeStatus({
            lastSync: new Date().toLocaleTimeString(),
            lastPushedComponent: data.componentName
          });
          this.notifyUser(`✓ Synced "${data.componentName}" to Figma Canvas!`, 'success');
        } catch (e) {}
      });

      this.sse.onerror = () => {
        // SSE disconnected, will auto reconnect
      };
    } catch (e) {}
  }

  connectWebSocket() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        this.connected = true;
        this.log('Connected to Figma Bridge WebSocket at ' + this.wsUrl, 'success');
        store.setBridgeStatus({ connected: true, clientsCount: 1 });
        this.ws.send(JSON.stringify({ type: 'CLIENT_IDENTIFY', role: 'WEB_APP' }));
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleIncomingMessage(msg);
        } catch (e) {
          console.warn('Bridge client parse error:', e);
        }
      };

      this.ws.onclose = () => {
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.scheduleReconnect();
      };
    } catch (e) {
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectWebSocket();
    }, 5000);
  }

  startHealthPolling() {
    setInterval(async () => {
      try {
        const res = await fetch(`${this.bridgeUrl}/api/status`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          this.connected = true;
          store.setBridgeStatus({
            connected: true,
            clientsCount: data.figmaClientsCount || 1,
            pendingCount: data.pendingCount || 0,
            lastSync: data.lastSync || store.bridgeStatus.lastSync
          });
        }
      } catch (e) {
        if (!this.connected) {
          store.setBridgeStatus({ connected: false });
        }
      }
    }, 4000);
  }

  handleIncomingMessage(msg) {
    switch (msg.type) {
      case 'FIGMA_CLIENT_CONNECTED':
        this.log(`Figma desktop plugin connected: ${msg.clientName || 'Instance'}`, 'info');
        store.setBridgeStatus({ connected: true, clientsCount: (store.bridgeStatus.clientsCount || 0) + 1 });
        break;

      case 'FIGMA_ACK':
        this.log(`✓ Figma Canvas synced: ${msg.componentName} (${msg.variantCount || 0} variants created)`, 'success');
        store.setBridgeStatus({
          lastSync: new Date().toLocaleTimeString(),
          lastPushedComponent: msg.componentName
        });
        this.notifyUser(`✓ Synced "${msg.componentName}" to Figma Canvas!`, 'success');
        break;

      case 'FIGMA_ERROR':
        this.log(`Figma sync error: ${msg.error}`, 'error');
        this.notifyUser(`Figma Error: ${msg.error}`, 'error');
        break;

      default:
        break;
    }
  }

  generateFigmaSyncPayload(component) {
    if (!component) {
      component = store.getActiveComponent();
    }
    // Generate component-specific variants matrix (Requirement 19 & 21)
    const variants = getComponentSpecificVariants(component);

    return {
      schemaVersion: '1.0.0',
      timestamp: new Date().toISOString(),
      action: 'CREATE_OR_UPDATE_COMPONENT_SET',
      component: {
        id: component.id,
        name: component.name,
        category: component.category || 'Drafts',
        description: component.description || '',
        anatomy: component.anatomy,
        propsSchema: component.props,
        activeProps: component.activeProps,
        matrixConfig: component.matrixConfig,
        variantsList: variants
      }
    };
  }

  generateProjectScopePayload(componentsList) {
    const list = (componentsList && componentsList.length > 0) ? componentsList : store.getIncludedComponents();
    const packagedComponents = list.map(c => {
      const p = this.generateFigmaSyncPayload(c);
      return p.component;
    });

    return {
      schemaVersion: '1.0.0',
      timestamp: new Date().toISOString(),
      action: 'SYNC_PROJECT_COMPONENTS_BATCH',
      type: 'SYNC_PROJECT_COMPONENTS_BATCH',
      batchCount: packagedComponents.length,
      components: packagedComponents
    };
  }

  async pushProjectScopeComponents(componentsList) {
    const components = (componentsList && componentsList.length > 0) ? componentsList : store.getIncludedComponents();
    if (!components.length) {
      this.notifyUser('No components selected in Project Scope!', 'warning');
      return { success: false, error: 'Empty scope' };
    }

    this.log(`Packaging all ${components.length} Project Scope components for Figma...`, 'info');
    const payload = this.generateProjectScopePayload(components);

    let sentViaWs = false;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          type: 'SYNC_PROJECT_COMPONENTS_BATCH',
          payload
        }));
        sentViaWs = true;
      } catch (e) {
        console.warn('WebSocket batch send failed, falling back to HTTP', e);
      }
    }

    try {
      const res = await fetch(`${this.bridgeUrl}/api/figma/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        this.log(`Pushed ${components.length} Project Scope components to Figma Bridge! Awaiting canvas sync...`, 'success');
        this.notifyUser(`✓ Pushed all ${components.length} Project Components to Figma!`, 'success');
        store.setBridgeStatus({
          lastPushedComponent: `Project Scope (${components.length} components)`,
          pendingCount: components.length
        });
        return { success: true, count: components.length, payload };
      }
    } catch (e) {
      if (sentViaWs) {
        this.notifyUser(`✓ Pushed ${components.length} Project Components via WebSocket!`, 'success');
        return { success: true, count: components.length, payload };
      }
      this.log(`Bridge connection failed: ${e.message}`, 'error');
      this.notifyUser(`Bridge server unreachable. Please run start.bat!`, 'warning');
      return { success: false, error: e.message };
    }
  }

  async pushComponent(component) {
    if (!component) {
      component = store.getActiveComponent();
    }
    const payload = this.generateFigmaSyncPayload(component);

    this.log(`Packaging "${component.name}" schema for Figma Bridge...`, 'info');

    let sentViaWs = false;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          type: 'PUSH_TO_FIGMA',
          payload
        }));
        sentViaWs = true;
      } catch (e) {
        console.warn('WebSocket send failed, falling back to HTTP', e);
      }
    }

    // Send to HTTP endpoint for SSE broadcast and pending queue
    try {
      const res = await fetch(`${this.bridgeUrl}/api/figma/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const resData = await res.json();
        this.log(`Payload sent to Figma Bridge! Awaiting Figma canvas sync...`, 'success');
        this.notifyUser(`✓ Pushed "${component.name}" to Figma Bridge!`, 'success');
        store.setBridgeStatus({
          lastPushedComponent: component.name,
          pendingCount: 1
        });
        return { success: true, method: sentViaWs ? 'websocket' : 'http', payload };
      }
    } catch (e) {
      if (sentViaWs) {
        this.notifyUser(`✓ Pushed "${component.name}" via WebSocket!`, 'success');
        return { success: true, method: 'websocket', payload };
      }
      this.log(`Bridge connection failed: ${e.message}. Is start.bat running?`, 'error');
      this.notifyUser(`Bridge server unreachable at localhost:9250. Please run start.bat!`, 'warning');
      return { success: false, error: e.message, payload };
    }
  }

  log(text, level = 'info') {
    const entry = {
      timestamp: new Date().toLocaleTimeString(),
      text,
      level
    };
    this.syncHistory.unshift(entry);
    if (this.syncHistory.length > 50) this.syncHistory.pop();
    store.emit('bridge:log', entry);
  }

  notifyUser(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `adsc-toast adsc-toast-${type}`;
    toast.innerHTML = `
      <div class="toast-dot"></div>
      <div class="toast-msg">${message}</div>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}

export const bridgeClient = new FigmaBridgeClient();
