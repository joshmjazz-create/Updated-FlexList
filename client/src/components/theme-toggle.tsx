import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/theme-context";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const getNextTheme = () => {
    switch (theme) {
      case 'light':
        return 'dark';
      case 'dark':
        return 'auto';
      case 'auto':
        return 'light';
      default:
        return 'light';
    }
  };

  const getLabel = () => {
    switch (theme) {
      case 'light':
        return 'L';
      case 'dark':
        return 'D';
      case 'auto':
        return 'A';
      default:
        return 'L';
    }
  };

  const handleToggle = () => {
    setTheme(getNextTheme());
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleToggle}
      className="w-8 h-8 p-0 font-mono font-bold text-sm"
      title={`Current: ${theme.charAt(0).toUpperCase() + theme.slice(1)} theme`}
    >
      {getLabel()}
    </Button>
  );
}