import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AgentControllerChat } from '@/components/chat/agent-controller-chat';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAgentControllerChat } from '@/lib/agent-controller/use-agent-controller-chat';

// The controller hook is lifted to the shell now, so feed AgentControllerChat a real session
// via a tiny host (the hook does no network on mount).
function AgentControllerChatHost() {
  const controller = useAgentControllerChat();
  return <AgentControllerChat controller={controller} />;
}

// The Agent Controller view mounts with the SHARED composer (full PromptInput) and
// the empty state — no network on mount. Proves the controller transport wiring
// renders without the live server.
describe('AgentControllerChat — Agent Controller view', () => {
  it('mounts with the shared composer and empty state', () => {
    render(
      <TooltipProvider>
        <AgentControllerChatHost />
      </TooltipProvider>,
    );
    expect(screen.getByPlaceholderText('Ask anything…')).toBeInTheDocument();
    expect(screen.getAllByText('Search').length).toBeGreaterThan(0);
    // AgentController empty-state hero.
    expect(screen.getByText(/on your mind today/)).toBeInTheDocument();
  });

  // A first send fails before any message exists. The empty state must still
  // show the error — otherwise Thinking… flashes and the screen looks unchanged.
  it('shows a failed first message on the empty state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        String(url) === '/api/agent-controller/stream'
          ? new Response('nope', { status: 502 })
          : Response.json({}),
      ),
    );
    try {
      render(
        <TooltipProvider>
          <AgentControllerChatHost />
        </TooltipProvider>,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Weather in LA' }));
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'AgentController error: controller stream failed: 502',
      );
      expect(screen.getByText(/on your mind today/)).toBeInTheDocument();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
