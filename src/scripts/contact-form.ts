// Formspree contact form: submits via fetch and reports status inline.
// Without JS the form posts normally.

type Status = 'idle' | 'sending' | 'sent' | 'error';

export function initContactForm(form: HTMLFormElement): void {
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const status = form.querySelector<HTMLElement>('[data-form-status]');
  const fallback = form.dataset.fallbackEmail ?? '';
  if (!button || !status) return;

  const label = button.querySelector<HTMLElement>('[data-label]');
  const idleLabel = label?.textContent ?? 'Send message';

  const show = (state: Status, message = '') => {
    form.dataset.state = state;
    status.textContent = message;
    button.disabled = state === 'sending';
    form.setAttribute('aria-busy', String(state === 'sending'));
    if (label) label.textContent = state === 'sending' ? 'Sending…' : idleLabel;
  };

  const failure = (reason: string) => {
    const tail = fallback ? ` You can also email me at ${fallback}.` : '';
    show('error', `${reason}${tail}`);
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (form.dataset.state === 'sending') return;
    show('sending', 'Sending your message…');

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        form.reset();
        show('sent', 'Thanks — your message is on its way. I’ll reply by email.');
        return;
      }

      const data: { errors?: { message?: string }[] } = await response.json().catch(() => ({}));
      const reason = data.errors?.map((e) => e.message).filter(Boolean).join(' ') || 'The message couldn’t be sent.';
      failure(reason);
    } catch {
      failure('The message couldn’t be sent. Check your connection and try again.');
    }
  });

  form.addEventListener('input', () => {
    if (form.dataset.state === 'sent' || form.dataset.state === 'error') show('idle');
  });
}
