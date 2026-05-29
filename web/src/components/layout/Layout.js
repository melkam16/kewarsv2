import { useState, useContext } from "react";
import { Outlet, useNavigate, useLocation, matchPath } from "react-router-dom";
import {
    AppBar,
    Toolbar,
    Typography,
    Drawer,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    CssBaseline,
    Box,
    IconButton,
    Divider,
    Button,
    Avatar,
} from "@mui/material";

import DashboardIcon from "@mui/icons-material/Dashboard";
import DescriptionIcon from "@mui/icons-material/Description";
import PeopleIcon from "@mui/icons-material/People";
import HelpIcon from "@mui/icons-material/Help";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";

import { AuthContext } from "../contexts/AuthContext";

const drawerWidth = 260;

const pages = [
    { name: "Dashboard", path: "/", icon: <DashboardIcon /> },
    { name: "Reports", path: "/reports", icon: <DescriptionIcon /> },
    { name: "Users", path: "/users", role: "admin", icon: <PeopleIcon /> },
    { name: "Help", path: "/help", icon: <HelpIcon /> },
];

export default function Layout() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const { logout, userRoles, user } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    // Determine current page name for AppBar
    const currentPage =
        pages.find((p) => matchPath(p.path, location.pathname))?.name ||
        "Dashboard";

    const drawer = (
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
            {/* Professional Logo and Header */}
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    px: 3,
                    py: 3,
                    cursor: "pointer",
                }}
                onClick={() => navigate("/")}
            >
                {/* Solid corporate shield icon */}
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '10px',
                    background: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L4 5V11.09C4 16.14 7.41 20.85 12 22C16.59 20.85 20 16.14 20 11.09V5L12 2Z" fill="#ffffff" opacity="0.95" />
                    <path d="M10 15.5L7.5 13L8.91 11.59L10 12.67L14.59 8.09L16 9.5L10 15.5Z" fill="#2563eb" />
                  </svg>
                </Box>
                <Box>
                    <Typography variant="subtitle1" sx={{ color: "#ffffff", fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                        KEWARS
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#9ca3af", fontWeight: 500, fontSize: '0.68rem' }}>
                        Early Warning System
                    </Typography>
                </Box>
            </Box>

            <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", mb: 1 }} />

            {/* Sidebar Navigation Items */}
            <List sx={{ flexGrow: 1, px: 0 }}>
                {pages
                    .filter((p) => !p.role || (userRoles && userRoles.includes(p.role)))
                    .map((item) => {
                        const isSelected = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
                        return (
                            <ListItemButton
                                key={item.name}
                                selected={isSelected}
                                onClick={() => navigate(item.path)}
                                sx={{
                                    mx: 1.5,
                                    my: 0.5,
                                    borderRadius: "8px",
                                    color: isSelected ? "#ffffff" : "#9ca3af",
                                    backgroundColor: isSelected ? "rgba(37, 99, 235, 0.15)" : "transparent",
                                    borderLeft: isSelected ? "3px solid #2563eb" : "3px solid transparent",
                                    "&.Mui-selected": {
                                        backgroundColor: "rgba(37, 99, 235, 0.15)",
                                        color: "#ffffff",
                                        "&:hover": {
                                            backgroundColor: "rgba(37, 99, 235, 0.22)",
                                        },
                                    },
                                    "&:hover": {
                                        backgroundColor: "rgba(255, 255, 255, 0.05)",
                                        color: "#ffffff",
                                        "& .MuiListItemIcon-root": {
                                            color: "#3b82f6",
                                        },
                                    },
                                    transition: "all 0.2s ease-in-out",
                                }}
                            >
                                <ListItemIcon
                                    sx={{
                                        color: isSelected ? "#3b82f6" : "#6b7280",
                                        minWidth: 40,
                                        transition: "color 0.2s",
                                    }}
                                >
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.name}
                                    primaryTypographyProps={{
                                        fontSize: "0.92rem",
                                        fontWeight: isSelected ? 700 : 500,
                                    }}
                                />
                            </ListItemButton>
                        );
                    })}
            </List>

            {/* Profile indicator card */}
            <Box
                sx={{
                    p: 2,
                    m: 2,
                    borderRadius: "10px",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                }}
            >
                <Avatar
                    sx={{
                        width: 36,
                        height: 36,
                        background: "#2563eb",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        color: "#ffffff",
                    }}
                >
                    {user?.name ? user.name.split(" ").map(n => n[0]).join("").toUpperCase() : "A"}
                </Avatar>
                <Box sx={{ overflow: "hidden" }}>
                    <Typography variant="body2" sx={{ color: "#ffffff", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: '0.82rem' }}>
                        {user?.name || "System Admin"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#9ca3af", textTransform: "capitalize", display: "block", fontSize: '0.7rem' }}>
                        {userRoles?.[0] || "Administrator"}
                    </Typography>
                </Box>
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#f3f4f6" }}>
            <CssBaseline />

            {/* AppBar */}
            <AppBar
                position="fixed"
                sx={{
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    ml: { sm: `${drawerWidth}px` },
                    backgroundColor: "#ffffff",
                    borderBottom: "1px solid #e5e7eb",
                    color: "#111827",
                    boxShadow: "none",
                }}
            >
                <Toolbar sx={{ justifyContent: "space-between" }}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                        <IconButton
                            color="inherit"
                            edge="start"
                            onClick={handleDrawerToggle}
                            sx={{ mr: 2, display: { sm: "none" } }}
                        >
                            <MenuIcon />
                        </IconButton>

                        <Typography variant="h6" sx={{ fontWeight: 700, color: "#111827", letterSpacing: "-0.01em" }}>
                            {currentPage}
                        </Typography>
                    </Box>

                    <Button
                        variant="outlined"
                        startIcon={<LogoutIcon />}
                        onClick={handleLogout}
                        sx={{
                            borderRadius: "8px",
                            fontWeight: 600,
                            borderColor: "#fecaca",
                            color: "#991b1b",
                            "&:hover": {
                                borderColor: "#991b1b",
                                backgroundColor: "#fef2f2",
                            },
                        }}
                    >
                        Logout
                    </Button>
                </Toolbar>
            </AppBar>

            {/* Sidebar */}
            <Box
                component="nav"
                sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
            >
                {/* Mobile */}
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: "block", sm: "none" },
                        "& .MuiDrawer-paper": {
                            width: drawerWidth,
                            backgroundColor: "#111827",
                            color: "#9ca3af",
                            borderRight: "1px solid rgba(255, 255, 255, 0.06)",
                        },
                    }}
                >
                    {drawer}
                </Drawer>

                {/* Desktop */}
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: "none", sm: "block" },
                        "& .MuiDrawer-paper": {
                            width: drawerWidth,
                            backgroundColor: "#111827",
                            color: "#9ca3af",
                            borderRight: "1px solid rgba(255, 255, 255, 0.06)",
                        },
                    }}
                    open
                >
                    {drawer}
                </Drawer>
            </Box>

            {/* Main Content */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 4,
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                }}
            >
                <Toolbar />
                <Outlet />
            </Box>
        </Box>
    );
}