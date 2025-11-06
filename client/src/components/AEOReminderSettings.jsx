// components/AEOReminderSettings.js
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Alert,
  Slider,
  Chip,
  Paper,
} from "@mui/material";
import { Settings as SettingsIcon } from "@mui/icons-material";

const AEOReminderSettings = ({ open, onClose, user }) => {
  const [settings, setSettings] = useState({
    reminder_enabled: true,
    reminder_days: 90,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (user) {
      setSettings({
        reminder_enabled: user.aeo_reminder_enabled ?? true,
        reminder_days: user.aeo_reminder_days ?? 90,
      });
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `${process.env.REACT_APP_API_STRING}/aeo/reminder-settings`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error("Error fetching reminder settings:", error);
    }
  };

  const updateSettings = async () => {
    setLoading(true);
    setMessage({ type: "", text: "" });
    
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `${process.env.REACT_APP_API_STRING}/aeo/reminder-settings`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(settings),
        }
      );
      
      const data = await response.json();
      if (data.success) {
        setMessage({ type: "success", text: "Settings updated successfully!" });
        setTimeout(() => {
          onClose();
          setMessage({ type: "", text: "" });
        }, 2000);
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to update settings" });
    } finally {
      setLoading(false);
    }
  };

  const handleSliderChange = (event, newValue) => {
    setSettings(prev => ({ ...prev, reminder_days: newValue }));
  };

  const handleInputChange = (event) => {
    const value = Math.min(365, Math.max(1, Number(event.target.value)));
    setSettings(prev => ({ ...prev, reminder_days: value }));
  };

  const handleBlur = () => {
    if (settings.reminder_days < 1) {
      setSettings(prev => ({ ...prev, reminder_days: 1 }));
    } else if (settings.reminder_days > 365) {
      setSettings(prev => ({ ...prev, reminder_days: 365 }));
    }
  };

  const testReminder = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `${process.env.REACT_APP_API_STRING}/aeo/test-reminder`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      const data = await response.json();
      if (data.success) {
        setMessage({ type: "success", text: "Test reminder sent successfully!" });
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to send test reminder" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <SettingsIcon sx={{ mr: 1 }} />
          AEO Certificate Reminder Settings
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {message.text && (
          <Alert severity={message.type} sx={{ mb: 2 }}>
            {message.text}
          </Alert>
        )}

        <FormControlLabel
          control={
            <Switch
              checked={settings.reminder_enabled}
              onChange={(e) => setSettings(prev => ({ 
                ...prev, 
                reminder_enabled: e.target.checked 
              }))}
              color="primary"
            />
          }
          label="Enable AEO Certificate Reminders"
          sx={{ mb: 3 }}
        />

        {settings.reminder_enabled && (
          <Box>
            <Typography gutterBottom>
              Remind me before expiry:
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Slider
                value={settings.reminder_days}
                onChange={handleSliderChange}
                min={1}
                max={365}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value} days`}
                sx={{ mb: 2 }}
              />
            </Box>

            <Box display="flex" alignItems="center" gap={2}>
              <TextField
                label="Days before expiry"
                type="number"
                value={settings.reminder_days}
                onChange={handleInputChange}
                onBlur={handleBlur}
                inputProps={{ min: 1, max: 365 }}
                size="small"
                sx={{ width: 120 }}
              />
              <Chip 
                label={`${settings.reminder_days} days`} 
                color="primary" 
                variant="outlined" 
              />
            </Box>

            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Current Setting:</strong> You will receive email reminders{' '}
                {settings.reminder_days} days before your AEO certificates expire.
              </Typography>
            </Box>

            <Box sx={{ mt: 2 }}>
              <Button 
                variant="outlined" 
                onClick={testReminder}
                disabled={loading}
                size="small"
              >
                Send Test Reminder
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={updateSettings} 
          variant="contained"
          disabled={loading}
        >
          {loading ? "Saving..." : "Save Settings"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AEOReminderSettings;