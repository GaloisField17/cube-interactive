export function syncButtonDisabledAppearance(button) {
  button.style.opacity = button.disabled ? "0.5" : "1";
  button.style.cursor = button.disabled ? "not-allowed" : "pointer";
}
