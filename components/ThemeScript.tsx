export default function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            function applyTheme() {
              const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              if (isDark) {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            }

            // Apply theme immediately
            applyTheme();

            // Listen for system theme changes
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
          })();
        `,
      }}
    />
  );
}
