import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import i18n, { LANGUAGE_STORAGE_KEY, setAppLanguage } from "@/i18n";

const storageState = new Map<string, string>();
const storageMock: Storage = {
  getItem: (key) => storageState.get(key) ?? null,
  setItem: (key, value) => {
    storageState.set(key, value);
  },
  removeItem: (key) => {
    storageState.delete(key);
  },
  clear: () => {
    storageState.clear();
  },
  key: (index) => Array.from(storageState.keys())[index] ?? null,
  get length() {
    return storageState.size;
  },
};

Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: storageMock,
});

describe("LanguageToggle", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await setAppLanguage("en");
  });

  it("defaults to English and persists manual selection", async () => {
    render(<LanguageToggle />);

    const englishButton = screen.getByRole("radio", { name: "English" });
    expect(englishButton).toHaveAttribute("data-state", "on");

    fireEvent.click(screen.getByRole("radio", { name: "Português" }));

    await waitFor(() => {
      expect(i18n.resolvedLanguage).toBe("pt");
      expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("pt");
    });
  });

  it("keeps desktop and mobile header toggles in sync", async () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    const desktopSpanishButton = screen.getAllByRole("radio", { name: "Español" })[0];
    fireEvent.click(desktopSpanishButton);

    await waitFor(() => {
      expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("es");
    });

    fireEvent.click(screen.getByRole("button", { name: /Toggle menu|Abrir menú|Abrir menu/ }));

    const mobileMenu = await screen.findByRole("dialog");
    const mobileSpanishButton = within(mobileMenu).getByRole("radio", { name: "Español" });

    expect(desktopSpanishButton).toHaveAttribute("data-state", "on");
    expect(mobileSpanishButton).toHaveAttribute("data-state", "on");
  });
});
