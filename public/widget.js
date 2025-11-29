(function() {
  // Get configuration from script tag
  const script = document.currentScript;
  const tenant = script.getAttribute('data-tenant');
  const position = script.getAttribute('data-position') || 'bottom-right';
  
  if (!tenant) {
    console.error('SupportHub: data-tenant attribute is required');
    return;
  }

  // Determine base URL
  const baseUrl = script.src.replace('/widget.js', '');

  // Create container
  const container = document.createElement('div');
  container.id = 'supporthub-widget';
  container.style.cssText = `
    position: fixed;
    ${position.includes('bottom') ? 'bottom: 16px;' : 'top: 16px;'}
    ${position.includes('right') ? 'right: 16px;' : 'left: 16px;'}
    z-index: 999999;
    font-family: system-ui, -apple-system, sans-serif;
  `;
  document.body.appendChild(container);

  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.src = `${baseUrl}/widget/${tenant}?embedded=true`;
  iframe.style.cssText = `
    width: 400px;
    height: 600px;
    border: none;
    border-radius: 16px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    display: none;
    background: white;
  `;
  iframe.allow = 'clipboard-write';
  
  // Create toggle button
  const button = document.createElement('button');
  button.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  `;
  button.style.cssText = `
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 10px 30px rgba(99, 102, 241, 0.4);
    transition: transform 0.2s, box-shadow 0.2s;
  `;
  button.onmouseenter = () => {
    button.style.transform = 'scale(1.05)';
    button.style.boxShadow = '0 15px 40px rgba(99, 102, 241, 0.5)';
  };
  button.onmouseleave = () => {
    button.style.transform = 'scale(1)';
    button.style.boxShadow = '0 10px 30px rgba(99, 102, 241, 0.4)';
  };

  let isOpen = false;

  button.onclick = () => {
    isOpen = !isOpen;
    iframe.style.display = isOpen ? 'block' : 'none';
    button.style.display = isOpen ? 'none' : 'flex';
  };

  // Listen for close message from iframe
  window.addEventListener('message', (event) => {
    if (event.data === 'supporthub:close') {
      isOpen = false;
      iframe.style.display = 'none';
      button.style.display = 'flex';
    }
  });

  container.appendChild(iframe);
  container.appendChild(button);
})();

