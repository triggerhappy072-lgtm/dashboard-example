(() => {
  if (document.body.dataset.featurePage !== 'Moderation') return;
  const home = document.getElementById('moderation-home-view');
  const detail = document.getElementById('moderation-detail-view');
  const main = document.querySelector('.main-content');
  if (!home || !detail) return;

  const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const toggle = (label, checked = false, help = true) => `<label class="mod-setting-row"><span>${label}${help ? ' <b class="mod-help">?</b>' : ''}</span><span class="moderation-toggle"><input type="checkbox" ${checked ? 'checked' : ''}><span></span></span></label>`;
  const header = (title, copy = '') => `<div class="mod-detail-header"><button class="mod-back" type="button" data-mod-back><span class="moderation-title-shield" aria-hidden="true"><svg viewBox="0 0 24 28"><path d="M12 1.5 21 4.6v7.2c0 6.6-3.6 11.8-9 14.7-5.4-2.9-9-8.1-9-14.7V4.6L12 1.5Z"/></svg></span><strong>Moderation</strong><span class="mod-breadcrumb">&rsaquo;</span><span>${title}</span></button>${copy ? `<p>${copy}</p>` : ''}</div>`;
  const picker = (kind, emptyText, options = null) => {
    const values = options || [`Preview ${kind} 1`, `Preview ${kind} 2`, `Preview ${kind} 3`];
    return `<div class="mod-picker" data-mod-picker><div class="mod-chip-list" data-mod-chip-list></div><button class="mod-picker-empty" type="button" data-mod-picker-open><span>+</span>${emptyText}</button><div class="mod-picker-menu" hidden><input type="search" placeholder="${kind}">${values.map((value) => `<button type="button" data-mod-choice="${esc(value)}">${esc(value)}</button>`).join('')}</div></div>`;
  };
  const section = (title, copy, body) => `<section class="mod-section"><h2>${title}</h2>${copy ? `<p>${copy}</p>` : ''}${body}</section>`;
  const dirtyBar = () => `<div class="mod-unsaved" data-mod-unsaved hidden><strong>Careful — you have unsaved changes!</strong><div><button type="button" data-mod-reset>Reset</button><button type="button" class="mod-primary" data-mod-save>Save changes</button></div></div>`;
  const reportState = { reasons: ['Harassment', 'Spam'], conditions: [] };
  const staffLimitations = [];
  const casePreview = [
    { id:'P-001', state:'Open', type:'Ban', user:'Preview member 1', reason:'Preview reason', duration:'Permanent', created:'Preview date', ageDays:0, author:'Preview moderator', confession:false },
    { id:'P-002', state:'Closed', type:'Warn', user:'Preview member 2', reason:'Preview reason 2', duration:'7 days', created:'Preview date', ageDays:3, author:'Preview moderator', confession:false },
    { id:'P-003', state:'Open', type:'Confession ban', user:'Hidden identity', reason:'Preview confession case', duration:'Permanent', created:'Preview date', ageDays:12, author:'Preview moderator', confession:true }
  ];
  const actionLabels = ['Delete messages','Send message','Report to moderators','DM user','Open moderation case','Add reactions','Add roles','Remove roles','Set roles','Remove levels'];
  const markDirty = () => detail.querySelector('[data-mod-unsaved]')?.removeAttribute('hidden');

  const ticketState = {
    view: 'overview',
    panels: [],
    forms: [],
    tags: [],
    teams: [{ name: 'Default', members: 0, roles: 0 }],
    blacklistUsers: [],
    blacklistRoles: [],
    integrations: []
  };

  const ticketToggle = (label, checked = false, disabled = false, help = '') => `<label class="ticket-toggle-row"><span><strong>${label}</strong>${help ? `<small>${help}</small>` : ''}</span><span class="moderation-toggle"><input type="checkbox" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}><span></span></span></label>`;
  const ticketInput = (label, value = '', placeholder = '', type = 'text', extra = '') => `<label class="ticket-field"><span>${label}</span><input type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${extra}></label>`;
  const ticketSelect = (label, options, selected = '') => `<label class="ticket-field"><span>${label}</span><select>${options.map((option) => `<option ${option === selected ? 'selected' : ''}>${esc(option)}</option>`).join('')}</select></label>`;
  const ticketEmpty = (title, copy, action = '') => `<div class="ticket-empty"><span class="ticket-empty-icon" aria-hidden="true">◇</span><strong>${title}</strong><p>${copy}</p>${action}</div>`;
  const ticketAccordion = (title, copy, body, open = false) => `<details class="ticket-accordion" ${open ? 'open' : ''}><summary><span><strong>${title}</strong><small>${copy}</small></span><b aria-hidden="true">⌄</b></summary><div class="ticket-accordion-body">${body}</div></details>`;
  const ticketPageHead = (title, copy, actions = '') => `<div class="ticket-page-head"><div><h2>${title}</h2><p>${copy}</p></div><div class="ticket-head-actions">${actions}</div></div>`;

  const ticketNav = [
    ['Tickets', [
      ['overview','Overview','▦'],
      ['tickets-list','Tickets','◆'],
      ['transcripts','Transcripts','▤'],
      ['analytics','Analytics','⌁']
    ]],
    ['Setup', [
      ['settings','Settings','⚙'],
      ['panels','Panels','▣'],
      ['forms','Forms','☷'],
      ['integrations','Integrations','⌘']
    ]],
    ['Content', [
      ['knowledge','Knowledge Base','▥'],
      ['tags','Tags','◈']
    ]],
    ['Moderation', [
      ['teams','Staff Teams','♟'],
      ['blacklist','Blacklist','⊘'],
      ['audit','Audit Log','◴']
    ]]
  ];

  function ticketNavMarkup() {
    return ticketNav.map(([group, items]) => `<div class="ticket-nav-group"><span>${group}</span>${items.map(([view, label, icon]) => `<button type="button" class="ticket-nav-item ${ticketState.view === view ? 'active' : ''}" data-ticket-view="${view}"><b aria-hidden="true">${icon}</b><em>${label}</em></button>`).join('')}</div>`).join('');
  }

  function ticketOverviewView() {
    return `${ticketPageHead('Overview', "A summary of your server's ticket activity.")}
      <div class="ticket-stats"><article><span>Open Tickets</span><strong>0</strong><small>Current</small></article><article><span>Total Tickets</span><strong>0</strong><small>All time</small></article></div>
      <section class="ticket-card ticket-chart-card"><h3>Tickets This Week</h3><div class="ticket-chart" aria-label="Tickets per day over the past 7 days. Peak: 0 tickets."><div class="ticket-chart-grid"></div><div class="ticket-chart-line zero"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="ticket-chart-labels"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div></div></section>
      <section class="ticket-card"><div class="ticket-card-head"><div><h3>Tickets</h3><p>Recent ticket activity</p></div><button class="mod-secondary" type="button" data-ticket-view="tickets-list">View all</button></div>${ticketEmpty('No ticket activity yet','Open tickets will appear here.')}</section>`;
  }

  function ticketTicketsView() {
    return `${ticketPageHead('Open Tickets for Next Step','View and manage all open tickets','<button class="mod-secondary" type="button" data-ticket-manage-labels>Manage Labels</button>')}
      <section class="ticket-card"><h3>Filter tickets by</h3><div class="ticket-filter-grid">
        ${ticketSelect('Panel',['Select a panel...','General Support','Billing','Appeals'])}
        ${ticketInput('Ticket ID','','Ticket ID')}
        ${ticketInput('Username','','Username')}
        ${ticketInput('User ID','','User ID')}
        ${ticketInput('Claimed By ID','','Claimed By ID')}
      </div><div class="ticket-inline-toggles">${ticketToggle('Only Show Unclaimed & My Tickets')}${ticketToggle('Unclaimed & Awaiting Response First',true)}</div></section>
      <div class="ticket-table-toolbar"><button class="mod-secondary" type="button" data-ticket-columns>Columns</button></div>
      <div class="ticket-table-wrap"><table class="ticket-table"><thead><tr><th><input type="checkbox" aria-label="Select all tickets"></th><th>ID ↕</th><th>Panel ↕</th><th>User ↕</th><th>Claimed By ↕</th><th>Last Message ↕</th><th>Awaiting Response ↕</th><th>Labels</th><th>Actions</th></tr></thead><tbody><tr><td colspan="9">${ticketEmpty('No open tickets','Your queue is clear! No tickets match the current filters.')}</td></tr></tbody></table></div>`;
  }

  function ticketTranscriptsView() {
    return `${ticketPageHead('Transcripts for Next Step','View and manage all transcripts','<button class="mod-secondary" type="button" data-ticket-manage-labels>Manage Labels</button>')}
      <section class="ticket-card"><h3>Filter transcripts by</h3><div class="ticket-filter-grid">${ticketSelect('Panel',['Select a panel...','General Support','Billing','Appeals'])}${ticketInput('Closed By','','User or ID')}${ticketInput('Claimed By','','User or ID')}</div></section>
      <div class="ticket-table-toolbar"><button class="mod-secondary" type="button" data-ticket-columns>Columns</button></div>
      <div class="ticket-table-wrap"><table class="ticket-table"><thead><tr><th>Ticket ID ↕</th><th>Username</th><th>Rating ↕</th><th>Close Reason ↕</th><th>Labels</th><th>Actions</th></tr></thead><tbody><tr><td colspan="6">${ticketEmpty('No transcripts yet','Closed ticket transcripts will appear here.')}</td></tr></tbody></table></div>`;
  }

  function ticketAnalyticsView() {
    return `${ticketPageHead('Analytics',"An overview of your server's ticket activity and performance.")}
      <section class="ticket-premium"><span aria-hidden="true">✦</span><div><h3>Analytics is a Premium feature</h3><p>Track ticket volume, measure response times, and monitor staff performance over time.</p></div><button class="mod-secondary" type="button">View Premium Plans</button></section>
      <div class="ticket-feature-grid">${[
        ['Ticket volume trends','Daily, weekly, monthly','⌁'],
        ['Response times','First response and resolution','◷'],
        ['Staff performance','Per-agent metrics and ratings','♟'],
        ['Feedback analytics','Satisfaction scores and trends','☆']
      ].map(([title,copy,icon]) => `<article><b>${icon}</b><strong>${title}</strong><small>${copy}</small></article>`).join('')}</div>`;
  }

  function ticketSettingsView() {
    return `${ticketPageHead('Global Settings for Next Step','Manage general and global settings for your server')}
      ${ticketAccordion('general','Configure general bot behaviour for your server',`
        <div class="ticket-form-grid">${ticketSelect('Language',['English','Dutch'],'English')}${ticketSelect('Claim Behaviour on Panel Switch',['Auto Unclaim','Keep Claimed'],'Auto Unclaim')}${ticketInput('Simultaneous Ticket Limit','10','','number','min="1" max="10"')}</div>
        ${ticketToggle('Anonymise Dashboard Responses')}
      `,true)}
      ${ticketAccordion('context menu','Start ticket via right-click context menu',`<div class="ticket-form-grid">${ticketSelect('Use Settings from Panel',['Select a panel...','General Support','Billing'])}${ticketSelect('Required Permission Level',['Everyone','Support','Moderator','Administrator'],'Everyone')}</div>${ticketToggle('Add Sender to Ticket',true)}`,true)}
      ${ticketAccordion('colour scheme','Customise the colours used in bot responses',`<div class="ticket-note"><b>✦</b><span>Customise your ticket embed colours.</span></div><div class="ticket-form-grid">${ticketInput('Success','#2ecc71')}${ticketInput('Failure','#fc3f35')}</div>`,true)}
      <div class="ticket-save-row"><button class="mod-primary" type="button" data-ticket-save>Save Changes</button></div>`;
  }

  function ticketPanelsView() {
    const panelRows = ticketState.panels.length ? ticketState.panels.map((panel, index) => `<tr><td>#support</td><td><strong>${esc(panel.title)}</strong></td><td><span class="ticket-status live">Active</span></td><td><button class="mod-secondary" type="button" data-ticket-edit-panel="${index}">Edit</button></td></tr>`).join('') : `<tr><td colspan="4">${ticketEmpty('No panels created yet','Panels let users open tickets in your server. Create one to get started.','<button class="mod-primary" type="button" data-ticket-create-panel>Create Panel</button>')}</td></tr>`;
    return `${ticketPageHead('Panels for Next Step','View and manage all panels and multi-panels','<button class="mod-secondary" type="button">Browse Gallery</button><button class="mod-primary" type="button" data-ticket-create-panel>Create Panel</button>')}
      <section class="ticket-card"><div class="ticket-card-head"><div><h3>Panels</h3><p>You've used <strong>${ticketState.panels.length}</strong> out of <strong>3</strong> panels</p></div></div><div class="ticket-table-wrap"><table class="ticket-table"><thead><tr><th>Channel ↕</th><th>Panel Name ↕</th><th>Status ↕</th><th>Action</th></tr></thead><tbody>${panelRows}</tbody></table></div></section>
      <section class="ticket-card"><div class="ticket-card-head"><div><h3>Multi-Panels</h3><p>Combine multiple panels into a single message.</p></div><button class="mod-primary" type="button" data-create-multi-panel ${ticketState.panels.length < 2 ? 'disabled' : ''}>Create Multi-Panel</button></div>${ticketState.panels.length < 2 ? '<div class="ticket-hint">You’ll need at least 2 panels to create a multi-panel.</div>' : ''}${ticketEmpty('No multi-panels yet','Multi-panels combine multiple panels into a single message.')}</section>`;
  }

  function ticketFormsView() {
    const body = ticketState.forms.length ? `<div class="ticket-list">${ticketState.forms.map((name,index) => `<div class="ticket-list-row"><span><strong>${esc(name)}</strong><small>Ticket intake form</small></span><button class="mod-secondary" type="button" data-ticket-edit-form="${index}">Edit</button></div>`).join('')}</div>` : ticketEmpty('No forms yet','Forms collect information from users when they open a ticket.','<button class="mod-primary" type="button" data-ticket-create-form>Create Form</button>');
    return `${ticketPageHead('Forms for Next Step','Create and manage forms to collect information from users','<button class="mod-primary" type="button" data-ticket-create-form>Create Form</button>')}<section class="ticket-card"><h3>Forms</h3>${body}</section>`;
  }

  function ticketFormCreateView() {
    return `${ticketPageHead('Create New Form','Create a form to collect information from users','<button class="mod-secondary" type="button" data-ticket-view="forms">Back to Forms</button>')}
      <section class="ticket-card ticket-narrow"><h3>Create New Form</h3>${ticketInput('Form Title','','e.g. Support request')}<div class="ticket-save-row"><button class="mod-primary" type="button" data-ticket-form-finish disabled>Create</button></div></section>`;
  }

  function ticketIntegrationsView() {
    return `${ticketPageHead('Integrations for Next Step','Connect third-party services to enhance your ticket system','<button class="mod-primary" type="button" data-ticket-create-integration>Create Integration</button>')}
      <section class="ticket-card"><h3>My Integrations</h3>${ticketState.integrations.length ? `<div class="ticket-list">${ticketState.integrations.map((name) => `<div class="ticket-list-row"><span><strong>${esc(name)}</strong><small>Custom integration</small></span><span class="ticket-status live">Connected</span></div>`).join('')}</div>` : '<p class="ticket-muted">You haven’t created any integrations yet.</p>'}</section>
      <section class="ticket-card"><h3>Available Integrations</h3><div class="ticket-integration-grid"><article><span class="ticket-integration-logo">B</span><div><strong>Bloxlink</strong><small>benhdev · 591 installs</small><p>Insert Roblox usernames, profile URLs and more into ticket welcome messages automatically.</p></div><div><button class="mod-secondary" type="button">View</button><button class="mod-primary" type="button">Add to server</button></div></article><article><span class="ticket-integration-logo">5M</span><div><strong>FiveM Integration</strong><small>benhdev · 257 installs</small><p>Fetch Steam IDs, usernames and related information from connected FiveM users.</p></div><div><button class="mod-secondary" type="button">View</button><button class="mod-primary" type="button">Add to server</button></div></article></div></section>`;
  }

  function ticketIntegrationCreateView() {
    return `${ticketPageHead('Create Integration','Build a custom integration to connect third-party services','<button class="mod-secondary" type="button" data-ticket-view="integrations">Back to Integrations</button>')}
      <div class="ticket-stepper"><span class="active">1. Metadata</span><b>›</b><span>2. HTTP Config</span></div>
      <section class="ticket-card ticket-narrow"><h3>Integration Metadata</h3><p class="ticket-muted">Let people know what your integration does.</p><div class="ticket-form-grid">${ticketInput('Name *','','Integration name')}${ticketInput('Image URL','','https://')}${ticketInput('Privacy Policy URL','','https://')}</div><label class="ticket-field"><span>Description *</span><textarea maxlength="255" placeholder="Describe what this integration does"></textarea></label><div class="ticket-save-row"><button class="mod-primary" type="button" data-ticket-integration-next disabled>Continue →</button></div></section>`;
  }

  function ticketKnowledgeView() {
    return `${ticketPageHead('Knowledge Base',"Manage articles and categories for your server's knowledge base",'<button class="mod-secondary" type="button">Go to Knowledge Base</button><button class="mod-primary" type="button" data-ticket-create-article>Create Article</button>')}
      <div class="ticket-kb-count"><strong>0</strong><span>articles</span></div>
      ${ticketAccordion('categories','Manage knowledge base categories','<div class="ticket-form-grid"><label class="ticket-field"><span>Emoji</span><select><option>Select an emoji...</option><option>📘</option><option>💡</option><option>🛠️</option></select></label><label class="ticket-field"><span>New Category Name *</span><input type="text" placeholder="e.g. Getting Started" data-ticket-kb-category></label></div><button class="mod-primary" type="button" data-ticket-kb-category-add disabled>Add</button><div class="ticket-empty-inline">No categories yet. Create one above.</div>')}
      ${ticketAccordion('customisation','Customise the appearance of your public knowledge base',`<div class="ticket-note"><b>✦</b><span>Customise colours, branding, and logo for your knowledge base. <strong>Premium feature</strong></span></div><div class="ticket-form-grid">${ticketInput('Primary Background','#111827','','text','disabled')}${ticketInput('Card Background','#1f2937','','text','disabled')}${ticketInput('Text Colour','#ffffff','','text','disabled')}${ticketInput('Accent Colour','#3b82f6','','text','disabled')}</div><button class="mod-secondary" type="button">View Premium Plans</button>`)}
      ${ticketEmpty('No articles yet','Start building your knowledge base to help users find answers.','<button class="mod-primary" type="button" data-ticket-create-article>Create Article</button>')}`;
  }

  function ticketTagsView() {
    return `${ticketPageHead('Tags for Next Step','Manage canned responses that staff can use in tickets via /tag','<button class="mod-secondary" type="button">Resync Command Aliases</button><button class="mod-primary" type="button" data-ticket-create-tag>Create Tag</button>')}
      ${ticketState.tags.length ? `<div class="ticket-list">${ticketState.tags.map((tag,index) => `<div class="ticket-list-row"><span><strong>/tag ${esc(tag.name)}</strong><small>${esc(tag.content)}</small></span><button class="mod-secondary" type="button" data-ticket-delete-tag="${index}">Remove</button></div>`).join('')}</div>` : ticketEmpty('No tags yet','Tags are reusable responses your staff can send in tickets.','<button class="mod-primary" type="button" data-ticket-create-tag>Create Tag</button>')}`;
  }

  function ticketTeamsView() {
    return `${ticketPageHead('Support Teams for Next Step','Manage support teams and their members')}
      <div class="ticket-two-col"><section class="ticket-card"><h3>Create Team</h3>${ticketInput('Team Name','','Team Name')}<button class="mod-primary" type="button" data-ticket-team-create disabled>Submit</button></section><section class="ticket-card"><h3>Manage Teams</h3>${ticketSelect('Team',ticketState.teams.map((team)=>team.name),'Default')}<button class="mod-danger" type="button">Delete</button></section></div>
      <section class="ticket-card"><h3>Manage Members</h3><div class="ticket-table-wrap"><table class="ticket-table"><thead><tr><th>Member</th><th>Role</th><th>Actions</th></tr></thead><tbody><tr><td colspan="3">${ticketEmpty('No team members yet','Members added through Discord will appear here.')}</td></tr></tbody></table></div></section>
      <section class="ticket-card"><h3>Add Role</h3><div class="ticket-inline-add"><select><option>Select a role...</option><option>@Support</option><option>@Moderator</option></select><button class="mod-primary" type="button" disabled>Add To Team</button></div></section>`;
  }

  function ticketBlacklistView() {
    return `${ticketPageHead('Blacklist for Next Step','Manage blacklisted users and roles who cannot open tickets','<button class="mod-secondary" type="button" data-ticket-blacklist-user>Blacklist User</button><button class="mod-secondary" type="button" data-ticket-blacklist-role>Blacklist Role</button>')}
      <section class="ticket-card"><h3>Blacklisted Roles</h3>${ticketState.blacklistRoles.length ? `<div class="ticket-list">${ticketState.blacklistRoles.map((v,i)=>`<div class="ticket-list-row"><strong>${esc(v)}</strong><button class="mod-secondary" type="button" data-ticket-unblacklist-role="${i}">Remove</button></div>`).join('')}</div>` : ticketEmpty('No blacklisted roles','Blacklisted roles cannot open tickets in your server.')}</section>
      <section class="ticket-card"><h3>Blacklisted Users</h3>${ticketState.blacklistUsers.length ? `<div class="ticket-list">${ticketState.blacklistUsers.map((v,i)=>`<div class="ticket-list-row"><strong>${esc(v)}</strong><button class="mod-secondary" type="button" data-ticket-unblacklist-user="${i}">Remove</button></div>`).join('')}</div>` : ticketEmpty('No blacklisted users','Blacklisted users cannot open tickets in your server.')}</section>`;
  }

  function ticketAuditView() {
    return `${ticketPageHead('Audit Log','Review changes made to ticket configuration and moderation actions')}
      <section class="ticket-card"><h3>Filter Audit Logs</h3><div class="ticket-filter-grid">${ticketInput('User ID','','User ID')}${ticketSelect('Action Type',['All Actions','Panel Created','Panel Edited','Ticket Claimed','Ticket Closed'],'All Actions')}${ticketSelect('Resource Type',['All Resources','Ticket','Panel','Form','Team'],'All Resources')}${ticketInput('Date From','','','date')}${ticketInput('Date To','','','date')}</div></section>
      <section class="ticket-card"><div class="ticket-card-head"><div><h3>Audit Logs (0 entries)</h3></div><button class="mod-secondary" type="button" data-ticket-columns>Columns</button></div><div class="ticket-table-wrap"><table class="ticket-table"><thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Resource</th></tr></thead><tbody><tr><td colspan="4">${ticketEmpty('No audit log entries','No entries match the current filters. Try adjusting the date range or filter criteria.')}</td></tr></tbody></table></div></section>`;
  }

  function ticketSetupView() {
    return `<div class="ticket-setup-hero"><div class="ticket-setup-orb">NS</div><h2>Welcome to Tickets</h2><p>Set up Next Step's support ticket system. This wizard covers teams, forms, panels, and basic settings.</p><ol><li><b>1</b><span><strong>Teams</strong><small>Choose who handles tickets.</small></span></li><li><b>2</b><span><strong>Forms</strong><small>Collect information from users.</small></span></li><li><b>3</b><span><strong>Panels</strong><small>Create ticket entry points.</small></span></li><li><b>4</b><span><strong>Settings</strong><small>Finish global behaviour.</small></span></li></ol><div><button class="mod-primary" type="button" data-ticket-view="teams">Let's get started</button><button class="mod-secondary" type="button" data-ticket-view="overview">Skip setup</button></div></div>`;
  }

  function ticketPanelBuilderView(panel = null) {
    const title = panel?.title || 'Open a ticket';
    return `${ticketPageHead(panel ? 'Edit Panel' : 'New Panel Creation',panel ? 'Update this ticket panel.' : 'Create a new panel to allow users to open tickets.','<button class="mod-secondary" type="button" data-ticket-view="panels">Back to Panels</button>')}
      ${ticketAccordion('panel appearance',"Configure the panel's appearance",`
        <h4>Panel Properties</h4>
        <div class="ticket-form-grid">
          ${ticketInput('Panel Title',title,'','text','data-ticket-panel-title')}
          ${ticketInput('Panel Colour','#2f8f68')}
          ${ticketSelect('Panel Channel',['Select a channel...','#support','#help','#tickets'])}
          ${ticketInput('Thumbnail URL','','https://')}
          ${ticketInput('Image URL','','https://')}
          ${ticketInput('Button Text (or an emoji)','Open Ticket','','text','data-ticket-panel-button')}
          ${ticketSelect('Button Colour',['Green','Blue','Red','Grey'],'Green')}
          ${ticketSelect('Button Emoji',['📩','🎫','💬','🛠'],'📩')}
        </div>
        <label class="ticket-field"><span>Panel Content</span><textarea data-ticket-panel-content>Click the button below to open a ticket.</textarea></label>
        ${ticketToggle('Disable Panel')}
        <div class="ticket-panel-preview"><span>Panel Preview</span><article><i></i><h4 data-ticket-preview-title>${esc(title)}</h4><p data-ticket-preview-content>Click the button below to open a ticket.</p><button type="button" data-ticket-preview-button>📩 Open Ticket</button></article></div>
      `,true)}
      ${ticketAccordion('routing','Configure team assignments, categories, and notifications',`
        <div class="ticket-form-grid">
          ${ticketSelect('Support Teams',['Default','Support','Moderation'],'Default')}
          ${ticketSelect('Knowledge Base Categories',['Select categories...','General Help','Rules'])}
          ${ticketSelect('Ticket Category *',['Select a category...','Tickets','Support','Overflow'])}
          ${ticketSelect('Awaiting Response Category',['No Awaiting Response Category','Awaiting Response'])}
          ${ticketSelect('Transcript Channel',['No Transcript Channel','#transcripts','#logs'])}
          ${ticketSelect('Mention On Open',['Select roles...','@Support','@Moderator'])}
          ${ticketSelect('Mentions Behaviour',['Do Nothing','Mention Once','Mention Until Claimed'],'Do Nothing')}
          ${ticketSelect('Form',['None',...ticketState.forms],'None')}
        </div>${ticketToggle('Enable Transcripts',true)}
      `,true)}
      ${ticketAccordion('welcome message','Configure the message sent on ticket open',`
        <h4>Welcome Message Properties</h4><div class="ticket-form-grid">${ticketInput('Title','','Welcome')}${ticketInput('Colour','#2f8f68')}${ticketInput('Title URL','','https://')}</div>
        <label class="ticket-field"><span>Description</span><textarea>Thank you for opening a ticket! A member of staff will be with you shortly.</textarea></label>
        ${ticketAccordion('Author Settings','Optional embed author information',`<div class="ticket-form-grid">${ticketInput('Author Name','','Next Step Support')}${ticketInput('Author URL','','https://')}${ticketInput('Author Icon URL','','https://')}</div>`)}
        ${ticketAccordion('Images','Optional embed images',`<div class="ticket-form-grid">${ticketInput('Thumbnail URL','','https://')}${ticketInput('Image URL','','https://')}</div>`)}
        ${ticketAccordion('Footer Settings','Optional embed footer',`<div class="ticket-note"><b>✦</b><span>Without premium this footer is replaced with “Powered by tickets.bot”.</span></div><div class="ticket-form-grid">${ticketInput('Footer Text','','e.g. Support hours: 9am-5pm UTC','text','disabled')}${ticketInput('Footer Icon URL','','e.g. https://example.com/footer-icon.png','text','disabled')}${ticketInput('Footer Timestamp','','','datetime-local')}</div><button class="mod-secondary" type="button">View Premium Plans</button>`)}
        ${ticketAccordion('Embed Fields','Add structured fields to the welcome embed','<div class="ticket-empty-inline">No embed fields added</div><div class="ticket-card-head"><small>0 / 25 fields</small><button class="mod-secondary" type="button" data-ticket-add-embed-field>+ Add Field</button></div>')}
        <div class="ticket-panel-preview ticket-welcome-preview"><span>Welcome Message Preview</span><article><i></i><p>Thank you for opening a ticket! A member of staff will be with you shortly.</p><small>Next Step</small></article></div>
      `)}
      ${ticketAccordion('ticket behaviour','Thread, naming, overflow, and rate limit settings',`
        ${ticketToggle('Create Tickets as Threads')}${ticketSelect('Thread Notification Channel',['Select a channel...','#support','#staff'])}
        <div class="ticket-form-grid">${ticketSelect('Naming Scheme',['ticket-%id%','ticket-%username%','ticket-%id%-%username%','Custom'],'ticket-%id%')}${ticketInput('Ticket Open Cooldown (seconds)','0','','number','min="0"')}${ticketInput('Max Open Tickets Per User','0','','number','min="0"')}</div>
        ${ticketToggle('Show in /open Command')}${ticketToggle('Enable Overflow Category')}
      `)}
      ${ticketAccordion('closing & claiming','Control how tickets are closed and claimed by support',`
        <div class="ticket-two-col"><div><h4>Closing</h4>${ticketToggle('Allow Users to Close Tickets',true)}${ticketToggle('Ticket Close Confirmation',true)}${ticketToggle('Enable User Feedback')}${ticketToggle('Hide Close Button')}${ticketToggle('Hide Close with Reason Button')}${ticketSelect('Exit Survey',['None','Quick rating','Full feedback'],'None')}</div><div><h4>Claiming</h4>${ticketToggle('Hide Claim Button')}${ticketToggle('Support Can View Claimed Tickets',true)}${ticketToggle('Support Can Type in Claimed Tickets')}</div></div>
      `)}
      ${ticketAccordion('permissions','Control what users can do inside tickets',`
        <div class="ticket-permission-grid">${['Add Reactions','Send Text-to-speech Messages','Embed Links','Attach Files','Use External Emojis','Use External Stickers','Send Voice Messages'].map((label)=>ticketToggle(label)).join('')}</div>
      `)}
      ${ticketAccordion('access control','Restrict who can open tickets via this panel',`
        <div class="ticket-inline-add"><select><option>Add another role...</option><option>@Support</option><option>@Member</option></select><button class="mod-secondary" type="button">Add Role</button></div>
        <div class="ticket-access-list"><div><span>@everyone</span><button class="ticket-access-allow" type="button">Allow</button></div><div><span>Everyone else</span><b>Allow</b></div></div>
      `)}
      ${ticketAccordion('auto close','Automatically close tickets based on inactivity',`
        ${ticketToggle('Enable Auto Close')}${ticketToggle('Close on User Leave',false,true)}
        <div class="ticket-note"><b>✦</b><span>Auto-close inactive tickets after a set period.</span></div>
        <div class="ticket-two-col"><div><h4>Since Open with No Response</h4><div class="ticket-duration"><input type="number" value="0" min="0"><span>Days</span><input type="number" value="0" min="0" max="23"><span>Hours</span><input type="number" value="0" min="0" max="59"><span>Minutes</span></div></div><div><h4>Since Last Message</h4><div class="ticket-duration"><input type="number" value="0" min="0"><span>Days</span><input type="number" value="0" min="0" max="23"><span>Hours</span><input type="number" value="0" min="0" max="59"><span>Minutes</span></div></div></div>
      `)}
      ${ticketAccordion('support hours','Limit when this panel accepts new tickets',`
        ${ticketSelect('Timezone',['America/New_York (GMT-04:00)','Europe/London (GMT+00:00)','UTC'],'America/New_York (GMT-04:00)')}
        <div class="ticket-support-state"><b>✓</b><span>Panel is available 24/7 (no restrictions)</span></div>
        <div class="ticket-hours-grid">${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((day)=>`<button type="button" data-ticket-hours-day="${day}"><strong>${day}</strong><small>24/7</small></button>`).join('')}</div>
        <div class="ticket-hours-actions"><button class="mod-secondary" type="button">Copy to weekdays</button><button class="mod-secondary" type="button" data-ticket-business-hours>Business hours</button><button class="mod-secondary" type="button" data-ticket-clear-hours>Clear all</button></div>
      `)}
      <div class="ticket-builder-footer"><button class="mod-secondary" type="button" data-ticket-view="panels">Cancel</button><button class="mod-primary" type="button" data-ticket-panel-finish>${panel ? 'Save Panel' : 'Create Panel'}</button></div>`;
  }

  function ticketViewMarkup(view) {
    if (view === 'overview') return ticketOverviewView();
    if (view === 'tickets-list') return ticketTicketsView();
    if (view === 'transcripts') return ticketTranscriptsView();
    if (view === 'analytics') return ticketAnalyticsView();
    if (view === 'settings') return ticketSettingsView();
    if (view === 'panels') return ticketPanelsView();
    if (view === 'panel-create') return ticketPanelBuilderView(ticketState.editingPanelIndex == null ? null : ticketState.panels[ticketState.editingPanelIndex]);
    if (view === 'forms') return ticketFormsView();
    if (view === 'form-create') return ticketFormCreateView();
    if (view === 'integrations') return ticketIntegrationsView();
    if (view === 'integration-create') return ticketIntegrationCreateView();
    if (view === 'knowledge') return ticketKnowledgeView();
    if (view === 'tags') return ticketTagsView();
    if (view === 'teams') return ticketTeamsView();
    if (view === 'blacklist') return ticketBlacklistView();
    if (view === 'audit') return ticketAuditView();
    if (view === 'setup') return ticketSetupView();
    return ticketOverviewView();
  }

  function ticketsScreen() {
    ticketState.view = 'overview';
    return `${header('Tickets','Manage tickets, panels, transcripts, staff, and support settings.')}<div class="ticket-app"><div class="ticket-setup-banner"><span>Complete your ticket setup to get the most out of Next Step.</span><div><button type="button" data-ticket-dismiss-banner>Dismiss</button><button class="mod-primary" type="button" data-ticket-view="setup">Continue Setup</button></div></div><div class="ticket-shell"><aside class="ticket-subnav" aria-label="Ticket management navigation">${ticketNavMarkup()}</aside><section class="ticket-stage" data-ticket-stage>${ticketViewMarkup(ticketState.view)}</section></div></div>`;
  }

  const screens = {
    cases: () => header('Cases') + `
      <div class="mod-toolbar"><label class="mod-search"><input type="search" data-case-search placeholder="Case ID / User ID / Reason"><button type="button">Search</button></label><button class="mod-secondary" type="button" data-mod-toggle-panel="case-filters">Filters</button><button class="mod-secondary" type="button" data-mod-toggle-panel="case-mass">Mass edit</button></div>
      <div class="mod-panel" id="case-filters" hidden><div class="mod-filter-grid"><label><input type="checkbox" data-case-type="Ban" checked> Bans</label><label><input type="checkbox" data-case-type="Kick" checked> Kicks</label><label><input type="checkbox" data-case-type="Mute" checked> Mutes</label><label><input type="checkbox" data-case-type="Warn" checked> Warns</label><label><input type="checkbox" data-case-state="Open" checked> Open</label><label><input type="checkbox" data-case-state="Closed" checked> Closed</label><label>Created <select data-case-created><option value="all">All time</option><option value="1">24 hours</option><option value="7">7 days</option><option value="30">30 days</option></select></label></div></div>
      <div class="mod-panel" id="case-mass" hidden><div class="mod-mass-actions"><strong data-case-count>Selected 0 cases</strong><button type="button" data-select-page>Select page</button><button type="button" data-select-all>Select all cases</button><button type="button" data-mass-edit>Edit</button><button type="button" data-mass-close>Close</button><button type="button" class="mod-danger" data-mass-delete>Delete</button></div></div>
      <div class="mod-preview-note">Preview data</div><div class="mod-table-wrap"><table class="mod-table mod-case-table"><thead><tr><th></th><th>Number</th><th>State</th><th>Type</th><th>User</th><th>Reason</th><th>Duration</th><th>Created</th><th>Author</th></tr></thead><tbody>${casePreview.map((item) => `<tr data-case-row data-case-id="${item.id}" data-case-kind="${item.type}" data-case-status="${item.state}" data-case-age="${item.ageDays}" data-case-text="${esc((item.id+' '+item.state+' '+item.type+' '+item.user+' '+item.reason+' '+item.duration+' '+item.author).toLowerCase())}"><td><input type="checkbox" data-case-select></td><td><button class="mod-link-button" type="button" data-open-case="${item.id}">${item.id}</button></td><td>${item.state}</td><td>${item.type}</td><td>${item.confession ? '<span class="mod-hidden-user">Hidden identity</span>' : esc(item.user)}</td><td>${esc(item.reason)}</td><td>${item.duration}</td><td>${item.created}</td><td>${item.author}</td></tr>`).join('')}</tbody></table></div>${dirtyBar()}`,

    'user-reports': () => header('User reports', 'Configure how members report users and how those reports are handled.') + `
      ${section('Report channel', 'Choose where new reports are sent.', picker('Channel', 'No channel added'))}
      ${section('Ways to report', '', toggle('Slash command', true, false) + toggle('Context command (right click)', true, false))}
      ${section('Predefined report reasons', 'Maintain a list of report reasons and optionally allow custom reasons.', '<div class="mod-simple-list" data-report-reason-list>'+reportState.reasons.map((r,i)=>'<div class="mod-simple-row"><span>'+esc(r)+'</span><button type="button" data-remove-report-reason="'+i+'">&times;</button></div>').join('')+'</div><div class="mod-inline-add"><input type="text" data-report-reason-input placeholder="New reason"><button class="mod-secondary" type="button" data-add-report-reason>Add reason</button></div>' + toggle('Allow custom reasons', true, false))}
      ${section('Automated actions', 'Choose what happens when a report is accepted or denied.', '<div class="mod-form-grid"><label>When accepted<select><option>Nothing</option><option>Delete report message</option><option>Move report message</option></select></label><label>Accepted move channel<input type="text" placeholder="Channel"></label><label>When denied<select><option>Nothing</option><option>Delete report message</option><option>Move report message</option></select></label><label>Denied move channel<input type="text" placeholder="Channel"></label><label>Delay<input type="text" value="0 seconds"></label></div>')}
      ${section('Advanced actions', 'Build conditions and actions for report automation.', '<div data-report-conditions></div><button class="mod-primary" type="button" data-add-report-condition>+ Add condition</button>')}
      ${section('Custom messages', 'Edit messages used during reporting.', '<div class="mod-list-stack"><button class="mod-nav-row" type="button" data-edit-template="Report created"><span><strong>Report created</strong><small>Edit message template</small></span><b>&rsaquo;</b></button><button class="mod-nav-row" type="button" data-edit-template="Report accepted"><span><strong>Report accepted</strong><small>Edit message template</small></span><b>&rsaquo;</b></button><button class="mod-nav-row" type="button" data-edit-template="Report denied"><span><strong>Report denied</strong><small>Edit message template</small></span><b>&rsaquo;</b></button></div>')}
      ${section('Ping roles', 'Roles pinged for reports.', picker('Role', 'No ping roles added'))}
      ${section('Only roles able to report', 'Use the list as a whitelist or blacklist.', '<label class="mod-select-line">Mode<select><option>Whitelist</option><option>Blacklist</option></select></label>'+picker('Role', 'No report roles added'))}
      ${section('Roles immune to reports', 'Use the list as a whitelist or blacklist.', '<label class="mod-select-line">Mode<select><option>Whitelist</option><option>Blacklist</option></select></label>'+picker('Role', 'No immune roles added'))}
      ${section('Automation log channel', 'Choose where report automation actions are logged.', picker('Channel', 'No log channel added'))}
      ${section('Requirements and limits', '', toggle('Force reason', false) + toggle('Force comment', false) + toggle('Force attachment', false) + '<div class="mod-form-grid"><label>Cooldown<input type="text" value="0 seconds"></label><label>Max open reports in this server<input type="text" value="Unlimited"></label><label>Max reports a user can receive at a time<input type="text" value="Unlimited"></label></div>' + toggle('Notify on report creation', true) + toggle('Notify on report update', true))}${dirtyBar()}`,

    'staff-limitations': () => header('Staff limitations', 'Limit sensitive staff actions and review effective permissions.') + `
      <div class="mod-two-grid"><section class="mod-tile"><h2>Permission Limitations</h2><p>Add roles or members and define how often they may perform sensitive actions.</p><button class="mod-primary" type="button" data-add-limitation>+ Add role or member</button><div class="mod-example-list" data-limitation-list>${staffLimitations.length ? staffLimitations.map((l)=>`<div>${esc(l.subject)} can ${esc(l.action)} a maximum of <strong>${l.limit}</strong> ${esc(l.target)} per ${esc(l.period)}.</div>`).join('') : '<div class="mod-empty-inline">No limitations configured</div>'}</div></section><section class="mod-tile"><h2>Permission Overview</h2><p>Members are ordered from highest permission level to lowest. Dangerous permissions are counted separately.</p><button class="mod-member-row" type="button" data-permission-member="Preview Administrator"><span>Preview Administrator</span><b class="mod-risk-count">5</b></button><button class="mod-member-row" type="button" data-permission-member="Preview Moderator"><span>Preview Moderator</span><b class="mod-risk-count">2</b></button><button class="mod-member-row" type="button" data-permission-member="Preview Helper"><span>Preview Helper</span><b class="mod-risk-count low">0</b></button></section></div>${dirtyBar()}`,

    tickets: () => ticketsScreen(),

    'deletion-log': () => header('Deletion log') + `<div class="mod-empty-state"><strong>No deletion log entries</strong><p>The commission includes a Deletion Log, but no additional details were provided for this section.</p></div>`,

    'punish-settings': () => header('Punish settings') + `<div class="mod-list-stack">${['Ban|Default reason and duration, actions and more','Kick|Default reason and duration, actions and more','Mute|Default reason and duration, actions, timeouts and more','Warn|Default reason and duration, actions and more','Risk|Default reason and duration, actions and more'].map((item) => { const [name, copy] = item.split('|'); return `<button class="mod-nav-row" type="button" data-punishment="${name.toLowerCase()}"><span><strong>${name}</strong><small>${copy}</small></span><b>&rsaquo;</b></button>`; }).join('')}</div><div class="mod-settings-list">${toggle('Reply to message to punish', true)}${toggle('Confirm punishment when recent case exists', true)}<label class="mod-inline-setting">Confirm when case created within the last <input type="number" value="5" min="1"> minutes</label>${toggle('Log expired punishments if user is not in guild', true, false)}${toggle('Cache deleted messages', false)}</div>${dirtyBar()}`,

    'pending-punishments': () => header('Pending punishments', 'Members who left before receiving a punishment are listed here and receive it when they return.') + `<div class="mod-preview-note">Preview data</div><div class="mod-table-wrap"><table class="mod-table"><thead><tr><th>User</th><th>Type</th><th>Reason</th><th>Duration</th><th>Created</th><th></th></tr></thead><tbody><tr><td>Preview member</td><td>Mute</td><td>Preview reason</td><td>1 day</td><td>Preview date</td><td><button class="mod-link-button" type="button" data-edit-pending>Edit</button> <button class="mod-link-button mod-danger-text" type="button" data-delete-pending>Delete</button></td></tr></tbody></table></div>${dirtyBar()}`,

    'immune-roles': () => header('Immune roles', 'Configure roles and members that are immune to moderation actions.') + `<div class="mod-choice-row"><label><input type="radio" name="immune-mode" value="custom" checked> Custom settings</label><label><input type="radio" name="immune-mode" value="hierarchy"> Use role hierarchy</label></div><div data-immune-hierarchy-note hidden class="mod-empty-inline">Role hierarchy is enabled. Users can only punish members below their highest role.</div><div data-immune-custom>${['Global','Bans','Kicks','Mutes','Warns','Risk'].map((name) => section(name, name === 'Global' ? 'The following roles and members are immune to every punishment.' : `The following roles and members are immune to ${name.toLowerCase()}.`, picker('Role or member', 'No roles or members added', ['Preview Role 1','Preview Role 2','Preview Member 1','Preview Member 2']))).join('')}</div>${dirtyBar()}`,

    'user-notifications': () => header('User notifications', 'Decide if users should get notified in their direct messages when they get punished.') + `<div class="mod-settings-list">${toggle('Notify users on punish', true)}${toggle('Notify users on unpunish', true)}${toggle('Notify users on punish by another user/bot', false)}${toggle('Notify users on unpunish by another user/bot', false)}${toggle('Send attachments to user', false)}</div>${dirtyBar()}`,

    'predefined-reasons': () => header('Predefined reasons', 'Define reason aliases for punishments.') + `<div class="mod-reason-list" data-reason-list><div class="mod-reason-row"><code>rule 1</code><span>You must follow the laws that apply to you.</span><button type="button" data-edit-reason> Edit </button></div></div><button class="mod-primary" type="button" data-add-reason>+ Add reason</button><div class="mod-add-reason" hidden><input type="text" placeholder="Alias"><input type="text" placeholder="Reason"><button type="button" data-save-reason>Save</button></div>${dirtyBar()}`,

    'channel-locking': () => header('Channel locking', 'Lock channels to prevent users from sending messages or joining voice channels.') + `${section('Ignored roles', 'The following roles will be ignored when locking channels.', picker('Role', 'No roles added'))}${dirtyBar()}`,

    privacy: () => header('Privacy', 'Decide what case information is shown to users.') + `${section('Command output message details', 'Choose which details are visible in command output messages.', '<div class="mod-check-grid"><label><input type="checkbox"> Author</label><label><input type="checkbox"> Proof</label><label><input type="checkbox"> Verified proof</label></div>')}${section('Direct message details', 'Choose which details are visible in direct notification messages.', '<div class="mod-check-grid"><label><input type="checkbox" checked> Author</label><label><input type="checkbox" checked> Proof</label><label><input type="checkbox" checked> Verified proof</label></div>')}${dirtyBar()}`
  };

  const punishments = {
    ban: { title: 'Ban', removal: true, extra: '' },
    kick: { title: 'Kick', removal: false, extra: '' },
    mute: { title: 'Mute', removal: true, extra: toggle('Allow multiple mutes', false) + toggle('Link with timeouts', false) + toggle('Extend timeouts', false) },
    warn: { title: 'Warn', removal: true, extra: '' },
    risk: { title: 'Risk', removal: true, extra: '' }
  };

  function openModal(content, extraClass = '') {
    const overlay = document.createElement('div');
    overlay.className = 'mod-modal-overlay';
    overlay.innerHTML = `<div class="mod-modal ${extraClass}"><button class="mod-modal-close" type="button">&times;</button>${content}</div>`;
    document.body.append(overlay);
    const onKey = (event) => { if (event.key === 'Escape') close(); };
    const close = () => { document.removeEventListener('keydown', onKey); overlay.remove(); };
    overlay.querySelector('.mod-modal-close')?.addEventListener('click', close);
    overlay.addEventListener('click', (event) => { if (event.target === overlay) close(); });
    document.addEventListener('keydown', onKey);
    return { overlay, modal: overlay.querySelector('.mod-modal'), close };
  }

  function bindPickers(root = detail) {
    root.querySelectorAll('[data-mod-picker]').forEach((pickerRoot) => {
      if (pickerRoot.dataset.bound === '1') return;
      pickerRoot.dataset.bound = '1';
      const open = pickerRoot.querySelector('[data-mod-picker-open]');
      const menu = pickerRoot.querySelector('.mod-picker-menu');
      const list = pickerRoot.querySelector('[data-mod-chip-list]');
      const input = menu?.querySelector('input');
      open?.addEventListener('click', () => { menu.hidden = !menu.hidden; if (!menu.hidden) input?.focus(); });
      menu?.querySelectorAll('[data-mod-choice]').forEach((choice) => choice.addEventListener('click', () => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'mod-chip';
        chip.textContent = `${choice.dataset.modChoice} ×`;
        chip.addEventListener('click', () => { chip.remove(); open.hidden = false; markDirty(); });
        list.append(chip);
        open.hidden = true;
        menu.hidden = true;
        markDirty();
      }));
      input?.addEventListener('input', () => {
        const q = input.value.trim().toLowerCase();
        menu.querySelectorAll('[data-mod-choice]').forEach((choice) => { choice.hidden = !!q && !choice.textContent.toLowerCase().includes(q); });
      });
    });
  }

  function openActionMenu(onPick) {
    const { modal, close } = openModal(`<h2>Add action</h2><div class="mod-action-menu">${actionLabels.map((label) => `<button type="button" data-action-type="${esc(label)}">${esc(label)}</button>`).join('')}</div>`, 'mod-action-menu-modal');
    modal.querySelectorAll('[data-action-type]').forEach((button) => button.addEventListener('click', () => {
      const type = button.dataset.actionType;
      close();
      openActionEditor(type, onPick);
    }));
  }

  function openActionEditor(type, onSave) {
    let fields = '';
    if (type === 'Delete messages') fields = '<label>Delete mode<select><option>Delete all</option><option>Delete overflow</option></select></label><label>Delay<input type="text" value="0 seconds"></label>';
    else if (type === 'Send message') fields = '<label>Template<input type="text" placeholder="Template or template list"></label>' + toggle('Reply to message', false, false) + toggle('Delete after', false, false) + '<label>Delete after time<input type="text" value="0 seconds"></label><label>Delay<input type="text" value="0 seconds"></label>';
    else if (type === 'Report to moderators') fields = '<label>Channel<input type="text" placeholder="Channel"></label><label>Reason<input type="text" placeholder="Reason"></label>' + picker('Role', 'No ping roles added');
    else if (type === 'DM user') fields = '<label>Template<input type="text" placeholder="Template or template list"></label><label>Delay<input type="text" value="0 seconds"></label>';
    else if (type === 'Open moderation case') fields = '<label>Punishment<select data-case-action-punishment><option>Risk</option><option>Warn</option><option>Mute</option><option>Kick</option><option>Ban</option></select></label><div data-case-action-fields></div><label>Delay<input type="text" value="0 seconds"></label>' + toggle('Send punishment done message', false) + toggle('Overwrite default DM config', false) + toggle('Send banusernotify message', false);
    else if (type === 'Add reactions') fields = '<label>Emoji<input type="text" placeholder="Emoji"></label>';
    else if (['Add roles', 'Remove roles', 'Set roles'].includes(type)) fields = picker('Role', 'No roles added') + '<label>Delay<input type="text" value="0 seconds"></label>';
    else if (type === 'Remove levels') fields = '<label>Mode<select><option>Add</option><option>Remove</option><option>Set</option></select></label><label>XP levels<input type="number" min="0" value="1"></label>';
    const { modal, close } = openModal(`<h2>${esc(type)}</h2><div class="mod-modal-form">${fields}</div><div class="mod-modal-footer"><button type="button" class="mod-secondary" data-action-cancel>Cancel</button><button type="button" class="mod-primary" data-action-save>Save action</button></div>`);
    bindPickers(modal);
    if (type === 'Open moderation case') {
      const select = modal.querySelector('[data-case-action-punishment]');
      const fieldsRoot = modal.querySelector('[data-case-action-fields]');
      const renderCaseFields = () => {
        const punishment = select.value;
        const risk = punishment === 'Risk' ? '<label>Risk points<input type="number" min="1" value="1"></label>' : '';
        const duration = punishment === 'Kick' ? '' : '<label>Duration<input type="text" placeholder="Permanent"></label>';
        fieldsRoot.innerHTML = `${risk}${duration}<label>Reason<input type="text" placeholder="Reason"></label>`;
      };
      select.addEventListener('change', renderCaseFields);
      renderCaseFields();
    }
    modal.querySelector('[data-action-cancel]')?.addEventListener('click', close);
    modal.querySelector('[data-action-save]')?.addEventListener('click', () => { onSave?.({ type }); markDirty(); close(); });
  }

  function openPunishment(name) {
    const cfg = punishments[name];
    if (!cfg) return;
    const { modal } = openModal(`<div class="mod-modal-tabs"><button class="active" type="button" data-punish-tab="punish">${cfg.title}</button>${cfg.removal ? `<button type="button" data-punish-tab="unpunish">Un${cfg.title.toLowerCase()}</button>` : ''}</div><div data-punish-pane></div>`);
    const render = (mode) => {
      const removal = mode === 'unpunish';
      modal.querySelector('[data-punish-pane]').innerHTML = `<label>Default reason<input type="text" placeholder="No reason provided"></label><label>Internal reason <b class="mod-help">?</b><input type="text" placeholder="Internal reason"></label>${removal ? '' : '<label>Default duration <b class="mod-help">?</b><input type="text" placeholder="Permanent"></label>'}${removal ? '' : '<div class="mod-action-box"><strong>Actions on punish</strong><div data-punish-action-list></div><button type="button" data-add-punish-action>+ No actions added</button></div>'}${toggle('Force reason', false)}${!removal ? cfg.extra : ''}${toggle('Always review', false)}${toggle('Delete proof message', false)}`;
      modal.querySelector('[data-add-punish-action]')?.addEventListener('click', () => openActionEditor('Delete messages', ({ type }) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'mod-action-chip';
        chip.textContent = type;
        modal.querySelector('[data-punish-action-list]').append(chip);
        modal.querySelector('[data-add-punish-action]').textContent = '+ Add action';
      }));
      modal.querySelectorAll('input,select').forEach((input) => input.addEventListener('change', markDirty));
    };
    render('punish');
    modal.querySelectorAll('[data-punish-tab]').forEach((button) => button.addEventListener('click', () => {
      modal.querySelectorAll('[data-punish-tab]').forEach((tab) => tab.classList.toggle('active', tab === button));
      render(button.dataset.punishTab);
    }));
  }

  function openCase(id) {
    const item = casePreview.find((entry) => entry.id === id);
    if (!item) return;
    const userField = item.confession ? '<div class="mod-case-field"><span>User</span><strong data-hidden-case-user>Hidden identity</strong><button type="button" class="mod-secondary" data-reveal-case-user>Reveal identity (admin role required)</button></div>' : `<div class="mod-case-field"><span>User</span><strong>${esc(item.user)}</strong></div>`;
    const { modal } = openModal(`<h2>Case ${item.id}</h2><div class="mod-case-detail-grid"><div class="mod-case-field"><span>Message history</span><strong>Preview history</strong></div><div class="mod-case-field"><span>Number</span><strong>${item.id}</strong></div><div class="mod-case-field"><span>State</span><select><option>${item.state}</option><option>${item.state === 'Open' ? 'Closed' : 'Open'}</option></select></div><div class="mod-case-field"><span>Type</span><strong>${esc(item.type)}</strong></div>${userField}<div class="mod-case-field"><span>Reason</span><input value="${esc(item.reason)}"></div><div class="mod-case-field"><span>Duration</span><input value="${esc(item.duration)}"></div><div class="mod-case-field"><span>Created</span><strong>${item.created}</strong></div><div class="mod-case-field"><span>Author</span><strong>${item.author}</strong></div><div class="mod-case-field"><span>Proof</span><textarea placeholder="Proof"></textarea></div><div class="mod-case-field"><span>Log message</span><strong>Preview log message</strong></div><div class="mod-case-field"><span>Closed</span><strong>${item.state === 'Closed' ? 'Preview date' : '—'}</strong></div><div class="mod-case-field"><span>Closed by</span><strong>${item.state === 'Closed' ? 'Preview moderator' : '—'}</strong></div><div class="mod-case-field"><span>User notify message</span><textarea placeholder="User notification"></textarea></div><div class="mod-case-field wide"><span>Moderator notes</span><textarea placeholder="Moderator notes"></textarea></div><div class="mod-case-field wide"><span>Edit history</span><div class="mod-history-box">No edits in preview data</div></div></div><div class="mod-modal-footer"><button class="mod-primary" type="button" data-save-case>Save case</button></div>`, 'mod-case-modal');
    modal.querySelector('[data-reveal-case-user]')?.addEventListener('click', () => {
      modal.querySelector('[data-hidden-case-user]').textContent = 'Preview hidden member';
      modal.querySelector('[data-reveal-case-user]').remove();
    });
    modal.querySelector('[data-save-case]')?.addEventListener('click', () => { markDirty(); modal.querySelector('[data-save-case]').textContent = 'Saved'; });
  }

  function openLimitationEditor() {
    const { modal, close } = openModal('<h2>Add staff limitation</h2><label>Role or member<select><option>Preview Administrator</option><option>Preview Moderator</option><option>Preview Member</option></select></label><label>Action<select><option>kick</option><option>ban</option><option>delete</option><option>manage roles for</option></select></label><label>Maximum<input type="number" min="1" value="1"></label><label>Target<select><option>members</option><option>channels</option><option>roles</option><option>actions</option></select></label><label>Period<select><option>day</option><option>hour</option><option>week</option></select></label><div class="mod-modal-footer"><button class="mod-primary" type="button" data-save-limitation>Save limitation</button></div>');
    modal.querySelector('[data-save-limitation]')?.addEventListener('click', () => {
      const values = [...modal.querySelectorAll('select,input')].map((input) => input.value);
      staffLimitations.push({ subject: values[0], action: values[1], limit: values[2], target: values[3], period: values[4] });
      close();
      showRoute('staff-limitations', false);
      markDirty();
    });
  }

  function openPermissionOverview(member) {
    const permissions = member.includes('Administrator') ? [['Administrator','danger','@Preview Admin'],['Ban Members','danger','@Preview Admin'],['Manage Roles','danger','@Preview Admin'],['Manage Channels','danger','@Preview Admin'],['Kick Members','danger','@Preview Moderator'],['Add Reactions','safe','@everyone']] : member.includes('Moderator') ? [['Ban Members','danger','@Preview Moderator'],['Kick Members','danger','@Preview Moderator'],['Add Reactions','safe','@everyone']] : [['Add Reactions','safe','@everyone'],['Send Messages','safe','@everyone']];
    openModal(`<h2>${esc(member)}</h2><p class="mod-modal-copy">Permissions are ordered from most dangerous to least dangerous. Each permission shows which role grants it.</p><div class="mod-permission-list">${permissions.map(([name, level, role]) => `<div class="mod-permission-row ${level}"><span><strong>${name}</strong><small>Granted by ${esc(role)}</small></span><b>${level === 'danger' ? 'Dangerous' : 'Normal'}</b></div>`).join('')}</div>`);
  }

  function openTemplateEditor(name) {
    const { modal, close } = openModal(`<h2>${esc(name)}</h2><label>Message content<textarea class="mod-big-textarea" placeholder="Message content"></textarea></label><div class="mod-modal-footer"><button class="mod-secondary" type="button" data-template-cancel>Cancel</button><button class="mod-primary" type="button" data-template-save>Save message</button></div>`);
    modal.querySelector('[data-template-cancel]')?.addEventListener('click', close);
    modal.querySelector('[data-template-save]')?.addEventListener('click', () => { markDirty(); close(); });
  }

  function renderReportConditions() {
    const root = detail.querySelector('[data-report-conditions]');
    if (!root) return;
    root.innerHTML = reportState.conditions.length ? reportState.conditions.map((condition, index) => `<div class="mod-condition-card"><div class="mod-condition-head"><strong>If user has</strong><input type="number" min="1" value="${condition.count}"><span>active reports</span><button type="button" data-remove-condition="${index}">&times;</button></div><div class="mod-condition-sub">Execute when not marked as edited within <input type="text" value="${esc(condition.window)}"></div><div class="mod-actions-list">${condition.actions.map((action, actionIndex) => `<button type="button" class="mod-action-chip" data-edit-report-action="${index}:${actionIndex}">${esc(action.type)}</button>`).join('')}</div><button class="mod-secondary" type="button" data-add-condition-action="${index}">+ Add action</button></div>`).join('') : '<div class="mod-empty-inline">No advanced conditions added</div>';
    root.querySelectorAll('[data-remove-condition]').forEach((button) => button.addEventListener('click', () => { reportState.conditions.splice(Number(button.dataset.removeCondition), 1); renderReportConditions(); markDirty(); }));
    root.querySelectorAll('[data-add-condition-action]').forEach((button) => button.addEventListener('click', () => openActionMenu((action) => { reportState.conditions[Number(button.dataset.addConditionAction)].actions.push(action); renderReportConditions(); markDirty(); })));
    root.querySelectorAll('[data-edit-report-action]').forEach((button) => button.addEventListener('click', () => {
      const [conditionIndex, actionIndex] = button.dataset.editReportAction.split(':').map(Number);
      const action = reportState.conditions[conditionIndex]?.actions[actionIndex];
      if (!action) return;
      openActionEditor(action.type, () => { markDirty(); renderReportConditions(); });
    }));
    root.querySelectorAll('.mod-condition-card').forEach((card, index) => {
      const inputs = card.querySelectorAll('input');
      inputs[0]?.addEventListener('input', () => { reportState.conditions[index].count = Number(inputs[0].value) || 1; markDirty(); });
      inputs[1]?.addEventListener('input', () => { reportState.conditions[index].window = inputs[1].value; markDirty(); });
    });
  }

  function bindCases() {
    const refresh = () => {
      const q = detail.querySelector('[data-case-search]')?.value.trim().toLowerCase() || '';
      const types = new Set([...detail.querySelectorAll('[data-case-type]:checked')].map((input) => input.dataset.caseType));
      const states = new Set([...detail.querySelectorAll('[data-case-state]:checked')].map((input) => input.dataset.caseState));
      const created = detail.querySelector('[data-case-created]')?.value || 'all';
      detail.querySelectorAll('[data-case-row]').forEach((row) => {
        const baseType = row.dataset.caseKind === 'Confession ban' ? 'Ban' : row.dataset.caseKind;
        const withinCreatedRange = created === 'all' || Number(row.dataset.caseAge) <= Number(created);
        row.hidden = !types.has(baseType) || !states.has(row.dataset.caseStatus) || !withinCreatedRange || (!!q && !row.dataset.caseText.includes(q));
      });
    };
    const syncCount = () => {
      const count = detail.querySelectorAll('[data-case-select]:checked').length;
      const output = detail.querySelector('[data-case-count]');
      if (output) output.textContent = `Selected ${count} case${count === 1 ? '' : 's'}`;
    };
    detail.querySelector('[data-case-search]')?.addEventListener('input', refresh);
    detail.querySelectorAll('[data-case-type],[data-case-state],[data-case-created]').forEach((input) => input.addEventListener('change', refresh));
    detail.querySelectorAll('[data-case-select]').forEach((input) => input.addEventListener('change', syncCount));
    detail.querySelector('[data-select-page]')?.addEventListener('click', () => { detail.querySelectorAll('[data-case-row]:not([hidden]) [data-case-select]').forEach((input) => { input.checked = true; }); syncCount(); });
    detail.querySelector('[data-select-all]')?.addEventListener('click', () => { detail.querySelectorAll('[data-case-select]').forEach((input) => { input.checked = true; }); syncCount(); });
    detail.querySelectorAll('[data-open-case]').forEach((button) => button.addEventListener('click', () => openCase(button.dataset.openCase)));
    detail.querySelector('[data-mass-close]')?.addEventListener('click', () => { detail.querySelectorAll('[data-case-select]:checked').forEach((input) => { const row = input.closest('tr'); row.dataset.caseStatus = 'Closed'; row.children[2].textContent = 'Closed'; }); markDirty(); });
    detail.querySelector('[data-mass-delete]')?.addEventListener('click', () => { detail.querySelectorAll('[data-case-select]:checked').forEach((input) => input.closest('tr').remove()); syncCount(); markDirty(); });
    detail.querySelector('[data-mass-edit]')?.addEventListener('click', () => {
      const { modal, close } = openModal('<h2>Mass edit cases</h2><label>Reason<input type="text" placeholder="Leave unchanged"></label><label>State<select><option>Leave unchanged</option><option>Open</option><option>Closed</option></select></label><div class="mod-modal-footer"><button class="mod-primary" type="button" data-mass-save>Apply to selected</button></div>');
      modal.querySelector('[data-mass-save]')?.addEventListener('click', () => { markDirty(); close(); });
    });
  }

  function bindReports() {
    renderReportConditions();
    detail.querySelector('[data-add-report-condition]')?.addEventListener('click', () => { reportState.conditions.push({ count: 3, window: '7 days', actions: [] }); renderReportConditions(); markDirty(); });
    detail.querySelector('[data-add-report-reason]')?.addEventListener('click', () => {
      const input = detail.querySelector('[data-report-reason-input]');
      if (!input?.value.trim()) return;
      reportState.reasons.push(input.value.trim());
      showRoute('user-reports', false);
      markDirty();
    });
    detail.querySelectorAll('[data-remove-report-reason]').forEach((button) => button.addEventListener('click', () => { reportState.reasons.splice(Number(button.dataset.removeReportReason), 1); showRoute('user-reports', false); markDirty(); }));
    detail.querySelectorAll('[data-edit-template]').forEach((button) => button.addEventListener('click', () => openTemplateEditor(button.dataset.editTemplate)));
  }

  function bindTickets() {
    const stage = () => detail.querySelector('[data-ticket-stage]');
    const flash = (message) => {
      const old = detail.querySelector('.ticket-toast');
      old?.remove();
      const toast = document.createElement('div');
      toast.className = 'ticket-toast';
      toast.textContent = message;
      detail.querySelector('.ticket-app')?.append(toast);
      setTimeout(() => toast.remove(), 1800);
    };
    const renderView = (view) => {
      ticketState.view = view;
      const root = stage();
      if (!root) return;
      root.innerHTML = ticketViewMarkup(view);
      detail.querySelectorAll('[data-ticket-view]').forEach((button) => {
        if (button.closest('.ticket-subnav')) button.classList.toggle('active', button.dataset.ticketView === view);
      });
      main?.scrollTo({ top: 0, behavior: 'auto' });
    };
    const openSimplePrompt = (title, label, onSave, placeholder = '') => {
      const { modal, close } = openModal(`<h2>${esc(title)}</h2><label>${esc(label)}<input type="text" placeholder="${esc(placeholder)}"></label><div class="mod-modal-footer"><button class="mod-secondary" type="button" data-ticket-cancel>Cancel</button><button class="mod-primary" type="button" data-ticket-confirm disabled>Save</button></div>`);
      const input = modal.querySelector('input');
      const save = modal.querySelector('[data-ticket-confirm]');
      input?.addEventListener('input', () => { save.disabled = !input.value.trim(); });
      modal.querySelector('[data-ticket-cancel]')?.addEventListener('click', close);
      save?.addEventListener('click', () => { onSave(input.value.trim()); close(); });
      input?.focus();
    };

    detail.addEventListener('click', (event) => {
      const viewButton = event.target.closest('[data-ticket-view]');
      if (viewButton) {
        if (viewButton.dataset.ticketView !== 'panel-create') ticketState.editingPanelIndex = null;
        renderView(viewButton.dataset.ticketView);
        return;
      }
      if (event.target.closest('[data-ticket-dismiss-banner]')) {
        event.target.closest('.ticket-setup-banner')?.remove();
        return;
      }
      if (event.target.closest('[data-ticket-create-panel]')) {
        ticketState.editingPanelIndex = null;
        renderView('panel-create');
        return;
      }
      const editPanel = event.target.closest('[data-ticket-edit-panel]');
      if (editPanel) {
        ticketState.editingPanelIndex = Number(editPanel.dataset.ticketEditPanel);
        renderView('panel-create');
        return;
      }
      if (event.target.closest('[data-ticket-panel-finish]')) {
        const title = detail.querySelector('[data-ticket-panel-title]')?.value.trim() || 'Open a ticket';
        const panel = { title };
        if (ticketState.editingPanelIndex == null) ticketState.panels.push(panel);
        else ticketState.panels[ticketState.editingPanelIndex] = panel;
        ticketState.editingPanelIndex = null;
        renderView('panels');
        flash('Panel saved in this frontend preview.');
        return;
      }
      if (event.target.closest('[data-create-multi-panel]')) {
        const { modal, close } = openModal(`<h2>Create Multi-Panel</h2><label>Panel Channel<select><option>#support</option><option>#help</option></select></label><label>Panels<select multiple size="4">${ticketState.panels.map((panel)=>`<option>${esc(panel.title)}</option>`).join('')}</select></label><label>Embed Title<input value="Choose a ticket type"></label><label>Embed Content<textarea class="mod-big-textarea">Select the ticket type that best matches what you need help with.</textarea></label><div class="mod-modal-footer"><button class="mod-secondary" type="button" data-multi-cancel>Cancel</button><button class="mod-primary" type="button" data-multi-save>Create Multi-Panel</button></div>`);
        modal.querySelector('[data-multi-cancel]')?.addEventListener('click', close);
        modal.querySelector('[data-multi-save]')?.addEventListener('click', () => { close(); flash('Multi-panel created in preview mode.'); });
        return;
      }
      if (event.target.closest('[data-ticket-create-form]')) {
        ticketState.editingFormIndex = null;
        renderView('form-create');
        return;
      }
      const editForm = event.target.closest('[data-ticket-edit-form]');
      if (editForm) {
        ticketState.editingFormIndex = Number(editForm.dataset.ticketEditForm);
        renderView('form-create');
        const input = stage()?.querySelector('.ticket-narrow input');
        if (input) {
          input.value = ticketState.forms[ticketState.editingFormIndex] || '';
          stage().querySelector('[data-ticket-form-finish]').disabled = !input.value.trim();
        }
        return;
      }
      if (event.target.closest('[data-ticket-form-finish]')) {
        const input = stage()?.querySelector('.ticket-narrow input');
        if (!input?.value.trim()) return;
        if (ticketState.editingFormIndex == null) ticketState.forms.push(input.value.trim());
        else ticketState.forms[ticketState.editingFormIndex] = input.value.trim();
        ticketState.editingFormIndex = null;
        renderView('forms');
        flash('Form added to the frontend preview.');
        return;
      }
      if (event.target.closest('[data-ticket-team-create]')) {
        const input = stage()?.querySelector('.ticket-two-col input');
        if (!input?.value.trim()) return;
        ticketState.teams.push({ name: input.value.trim(), members: 0, roles: 0 });
        renderView('teams');
        flash('Support team added to the frontend preview.');
        return;
      }
      if (event.target.closest('[data-ticket-kb-category-add]')) {
        const input = stage()?.querySelector('[data-ticket-kb-category]');
        if (!input?.value.trim()) return;
        const empty = input.closest('.ticket-accordion-body')?.querySelector('.ticket-empty-inline');
        if (empty) empty.textContent = `Category “${input.value.trim()}” added in this frontend preview.`;
        input.value = '';
        event.target.disabled = true;
        return;
      }
      if (event.target.closest('[data-ticket-create-integration]')) {
        renderView('integration-create');
        return;
      }
      if (event.target.closest('[data-ticket-integration-next]')) {
        const name = stage()?.querySelector('.ticket-narrow input')?.value.trim();
        const { modal, close } = openModal('<h2>HTTP Config</h2><label>Request URL<input placeholder="https://api.example.com/tickets"></label><label>Method<select><option>POST</option><option>GET</option><option>PUT</option></select></label><label>Headers<textarea class="mod-big-textarea" placeholder="Authorization: Bearer ..."></textarea></label><label>Request body<textarea class="mod-big-textarea" placeholder="{ &quot;ticket_id&quot;: &quot;%ticket_id%&quot; }"></textarea></label><div class="mod-modal-footer"><button class="mod-primary" type="button" data-ticket-integration-finish>Create Integration</button></div>');
        modal.querySelector('[data-ticket-integration-finish]')?.addEventListener('click', () => {
          ticketState.integrations.push(name || 'Custom Integration');
          close();
          renderView('integrations');
          flash('Integration added to the frontend preview.');
        });
        return;
      }
      if (event.target.closest('[data-ticket-create-article]')) {
        const { modal, close } = openModal('<h2>Create Article</h2><label>Title<input placeholder="Article title"></label><label>Category<select><option>Uncategorised</option><option>General Help</option></select></label><label>Content<textarea class="mod-big-textarea" placeholder="Write the knowledge base article"></textarea></label><div class="mod-modal-footer"><button class="mod-secondary" type="button" data-ticket-modal-cancel>Cancel</button><button class="mod-primary" type="button" data-ticket-modal-save>Save Article</button></div>');
        modal.querySelector('[data-ticket-modal-cancel]')?.addEventListener('click', close);
        modal.querySelector('[data-ticket-modal-save]')?.addEventListener('click', () => { close(); flash('Article editor works in preview mode.'); });
        return;
      }
      if (event.target.closest('[data-ticket-create-tag]')) {
        const { modal, close } = openModal('<h2>Create Tag</h2><label>Name<input placeholder="hours"></label><label>Response<textarea class="mod-big-textarea" placeholder="Reusable staff response"></textarea></label><div class="mod-modal-footer"><button class="mod-secondary" type="button" data-ticket-modal-cancel>Cancel</button><button class="mod-primary" type="button" data-ticket-modal-save>Save Tag</button></div>');
        modal.querySelector('[data-ticket-modal-cancel]')?.addEventListener('click', close);
        modal.querySelector('[data-ticket-modal-save]')?.addEventListener('click', () => {
          const values = modal.querySelectorAll('input,textarea');
          if (!values[0].value.trim()) return;
          ticketState.tags.push({ name: values[0].value.trim(), content: values[1].value.trim() || 'Preview response' });
          close();
          renderView('tags');
        });
        return;
      }
      const deleteTag = event.target.closest('[data-ticket-delete-tag]');
      if (deleteTag) {
        ticketState.tags.splice(Number(deleteTag.dataset.ticketDeleteTag),1);
        renderView('tags');
        return;
      }
      if (event.target.closest('[data-ticket-blacklist-user]')) {
        openSimplePrompt('Blacklist User','User ID',(value)=>{ ticketState.blacklistUsers.push(value); renderView('blacklist'); },'Discord user ID');
        return;
      }
      if (event.target.closest('[data-ticket-blacklist-role]')) {
        openSimplePrompt('Blacklist Role','Role ID',(value)=>{ ticketState.blacklistRoles.push(value); renderView('blacklist'); },'Discord role ID');
        return;
      }
      const removeUser = event.target.closest('[data-ticket-unblacklist-user]');
      if (removeUser) {
        ticketState.blacklistUsers.splice(Number(removeUser.dataset.ticketUnblacklistUser),1);
        renderView('blacklist');
        return;
      }
      const removeRole = event.target.closest('[data-ticket-unblacklist-role]');
      if (removeRole) {
        ticketState.blacklistRoles.splice(Number(removeRole.dataset.ticketUnblacklistRole),1);
        renderView('blacklist');
        return;
      }
      if (event.target.closest('[data-ticket-manage-labels]')) {
        openModal('<h2>Manage Labels</h2><div class="ticket-list"><div class="ticket-list-row"><span><strong>Urgent</strong><small>High priority tickets</small></span><button class="mod-secondary" type="button">Edit</button></div><div class="ticket-list-row"><span><strong>Awaiting user</strong><small>Waiting for a response</small></span><button class="mod-secondary" type="button">Edit</button></div></div><button class="mod-primary" type="button">+ New Label</button>');
        return;
      }
      if (event.target.closest('[data-ticket-columns]')) {
        openModal('<h2>Columns</h2><div class="ticket-check-list"><label><input type="checkbox" checked> ID</label><label><input type="checkbox" checked> Panel</label><label><input type="checkbox" checked> User</label><label><input type="checkbox" checked> Claimed By</label><label><input type="checkbox" checked> Last Message</label><label><input type="checkbox" checked> Labels</label></div>');
        return;
      }
      if (event.target.closest('[data-ticket-add-embed-field]')) {
        const holder = event.target.closest('.ticket-accordion-body')?.querySelector('.ticket-empty-inline');
        if (holder) holder.outerHTML = '<div class="ticket-list-row"><span><strong>Field name</strong><small>Field value preview</small></span><button class="mod-secondary" type="button">Edit</button></div>';
        return;
      }
      const day = event.target.closest('[data-ticket-hours-day]');
      if (day) {
        day.classList.toggle('active');
        day.querySelector('small').textContent = day.classList.contains('active') ? '09:00–17:00' : '24/7';
        return;
      }
      if (event.target.closest('[data-ticket-business-hours]')) {
        detail.querySelectorAll('[data-ticket-hours-day]').forEach((button) => {
          const weekday = !['Sunday','Saturday'].includes(button.dataset.ticketHoursDay);
          button.classList.toggle('active', weekday);
          button.querySelector('small').textContent = weekday ? '09:00–17:00' : '24/7';
        });
        return;
      }
      if (event.target.closest('[data-ticket-clear-hours]')) {
        detail.querySelectorAll('[data-ticket-hours-day]').forEach((button) => {
          button.classList.remove('active');
          button.querySelector('small').textContent = '24/7';
        });
        return;
      }
      if (event.target.closest('[data-ticket-save]')) {
        flash('Settings saved in this frontend preview.');
      }
    });

    detail.addEventListener('input', (event) => {
      if (!event.target.closest('.ticket-app')) return;
      if (ticketState.view === 'form-create') {
        const button = stage()?.querySelector('[data-ticket-form-finish]');
        if (button) button.disabled = !stage().querySelector('input')?.value.trim();
      }
      if (ticketState.view === 'integration-create') {
        const inputs = stage()?.querySelectorAll('.ticket-narrow input') || [];
        const button = stage()?.querySelector('[data-ticket-integration-next]');
        if (button) button.disabled = !inputs[0]?.value.trim() || !stage()?.querySelector('textarea')?.value.trim();
      }
      if (ticketState.view === 'teams') {
        const input = stage()?.querySelector('.ticket-two-col input');
        const button = stage()?.querySelector('[data-ticket-team-create]');
        if (button) button.disabled = !input?.value.trim();
      }
      if (ticketState.view === 'knowledge' && event.target.matches('[data-ticket-kb-category]')) {
        const button = stage()?.querySelector('[data-ticket-kb-category-add]');
        if (button) button.disabled = !event.target.value.trim();
      }
      if (event.target.matches('[data-ticket-panel-title]')) {
        const preview = detail.querySelector('[data-ticket-preview-title]');
        if (preview) preview.textContent = event.target.value || 'Open a ticket';
      }
      if (event.target.matches('[data-ticket-panel-content]')) {
        const preview = detail.querySelector('[data-ticket-preview-content]');
        if (preview) preview.textContent = event.target.value || 'Click the button below to open a ticket.';
      }
      if (event.target.matches('[data-ticket-panel-button]')) {
        const preview = detail.querySelector('[data-ticket-preview-button]');
        if (preview) preview.textContent = `📩 ${event.target.value || 'Open Ticket'}`;
      }
    });
    detail.addEventListener('change', (event) => {
      if (event.target.closest('.ticket-app')) markDirty();
    });
    detail.addEventListener('keyup', (event) => {
      if (ticketState.view === 'teams' && event.target.closest('.ticket-two-col')) {
        const button = stage()?.querySelector('[data-ticket-team-create]');
        if (button && !button.disabled && event.key === 'Enter') {
          ticketState.teams.push({ name: event.target.value.trim(), members: 0, roles: 0 });
          renderView('teams');
        }
      }
    });
  }

  function bindDetail(route) {
    detail.querySelector('[data-mod-back]')?.addEventListener('click', showHome);
    detail.querySelectorAll('[data-mod-toggle-panel]').forEach((button) => button.addEventListener('click', () => {
      const panel = detail.querySelector(`#${button.dataset.modTogglePanel}`);
      if (panel) panel.hidden = !panel.hidden;
    }));
    bindPickers(detail);
    detail.querySelectorAll('[data-punishment]').forEach((button) => button.addEventListener('click', () => openPunishment(button.dataset.punishment)));
    detail.querySelectorAll('input,select,textarea').forEach((input) => { if (!input.matches('[data-case-select],[data-case-search],[data-case-type],[data-case-state],[data-case-created]')) input.addEventListener('change', markDirty); });
    detail.querySelector('[data-mod-save]')?.addEventListener('click', () => { detail.querySelector('[data-mod-unsaved]').hidden = true; });
    detail.querySelector('[data-mod-reset]')?.addEventListener('click', () => showRoute(route, false));
    if (route === 'cases') bindCases();
    if (route === 'user-reports') bindReports();
    if (route === 'tickets') bindTickets();
    detail.querySelector('[data-add-limitation]')?.addEventListener('click', openLimitationEditor);
    detail.querySelectorAll('[data-permission-member]').forEach((button) => button.addEventListener('click', () => openPermissionOverview(button.dataset.permissionMember)));
    detail.querySelector('[data-edit-pending]')?.addEventListener('click', () => {
      const { modal, close } = openModal('<h2>Edit pending punishment</h2><div class="mod-case-detail-grid"><div class="mod-case-field"><span>Message history</span><strong>Preview history</strong></div><div class="mod-case-field"><span>Number</span><strong>Pending preview</strong></div><div class="mod-case-field"><span>State</span><strong>Pending</strong></div><div class="mod-case-field"><span>Type</span><select><option>Mute</option><option>Warn</option><option>Kick</option><option>Ban</option><option>Risk</option></select></div><div class="mod-case-field"><span>User</span><strong>Preview member</strong></div><div class="mod-case-field"><span>Reason</span><input value="Preview reason"></div><div class="mod-case-field"><span>Duration</span><input value="1 day"></div><div class="mod-case-field"><span>Created</span><strong>Preview date</strong></div><div class="mod-case-field"><span>Author</span><strong>Preview moderator</strong></div><div class="mod-case-field"><span>Proof</span><textarea placeholder="Proof"></textarea></div><div class="mod-case-field"><span>Log message</span><strong>Preview log message</strong></div><div class="mod-case-field"><span>Closed</span><strong>—</strong></div><div class="mod-case-field"><span>Closed by</span><strong>—</strong></div><div class="mod-case-field"><span>User notify message</span><textarea placeholder="User notification"></textarea></div><div class="mod-case-field wide"><span>Moderator notes</span><textarea placeholder="Moderator notes"></textarea></div><div class="mod-case-field wide"><span>Edit history</span><div class="mod-history-box">No edits in preview data</div></div></div><div class="mod-modal-footer"><button class="mod-primary" type="button" data-pending-save>Save</button></div>');
      modal.querySelector('[data-pending-save]')?.addEventListener('click', () => { markDirty(); close(); });
    });
    detail.querySelector('[data-delete-pending]')?.addEventListener('click', (event) => { event.currentTarget.closest('tr').remove(); markDirty(); });
    detail.querySelectorAll('input[name="immune-mode"]').forEach((input) => input.addEventListener('change', () => {
      const custom = detail.querySelector('[data-immune-custom]');
      const note = detail.querySelector('[data-immune-hierarchy-note]');
      const hierarchy = input.value === 'hierarchy' && input.checked;
      if (custom) custom.hidden = hierarchy;
      if (note) note.hidden = !hierarchy;
      markDirty();
    }));

    const addReason = detail.querySelector('[data-add-reason]');
    const addReasonForm = detail.querySelector('.mod-add-reason');
    addReason?.addEventListener('click', () => { addReasonForm.hidden = !addReasonForm.hidden; addReasonForm.querySelector('input')?.focus(); });
    detail.querySelector('[data-save-reason]')?.addEventListener('click', () => {
      const inputs = addReasonForm.querySelectorAll('input');
      if (!inputs[0].value.trim() || !inputs[1].value.trim()) return;
      const row = document.createElement('div');
      row.className = 'mod-reason-row';
      row.innerHTML = `<code>${esc(inputs[0].value)}</code><span>${esc(inputs[1].value)}</span><button type="button" data-edit-reason>Edit</button>`;
      detail.querySelector('[data-reason-list]').append(row);
      inputs.forEach((input) => { input.value = ''; });
      addReasonForm.hidden = true;
      markDirty();
    });
    detail.querySelector('[data-reason-list]')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-edit-reason]');
      if (!button) return;
      const row = button.closest('.mod-reason-row');
      const alias = row.querySelector('code').textContent;
      const reason = row.querySelector('span').textContent;
      const { modal, close } = openModal(`<h2>Edit reason</h2><label>Alias<input value="${esc(alias)}"></label><label>Reason<input value="${esc(reason)}"></label><div class="mod-modal-footer"><button class="mod-danger" type="button" data-reason-delete>Delete</button><button class="mod-primary" type="button" data-reason-save>Save</button></div>`);
      modal.querySelector('[data-reason-save]')?.addEventListener('click', () => { const values = modal.querySelectorAll('input'); row.querySelector('code').textContent = values[0].value; row.querySelector('span').textContent = values[1].value; close(); markDirty(); });
      modal.querySelector('[data-reason-delete]')?.addEventListener('click', () => { row.remove(); close(); markDirty(); });
    });
  }

  function showRoute(route, push = true) {
    if (!screens[route]) return;
    home.hidden = true;
    detail.hidden = false;
    detail.innerHTML = screens[route]();
    bindDetail(route);
    main?.scrollTo({ top: 0, behavior: 'auto' });
    if (push) history.replaceState(null, '', `#${route}`);
  }

  function showHome() {
    detail.hidden = true;
    detail.replaceChildren();
    home.hidden = false;
    main?.scrollTo({ top: 0, behavior: 'auto' });
    history.replaceState(null, '', location.pathname + location.search);
  }

  document.querySelectorAll('[data-moderation-route]').forEach((button) => button.addEventListener('click', () => showRoute(button.dataset.moderationRoute)));
  const initial = location.hash.slice(1);
  if (screens[initial]) showRoute(initial, false);
})();
