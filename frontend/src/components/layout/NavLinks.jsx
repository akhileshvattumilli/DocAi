const NavLinks = [
    {
        label: "Dashboard",
        authRequired: false,
        href: "/"
    },
    {
        label: "Waitlist",
        authRequired: true,
        apiHealthRequired: true,
        href: "/waitlists"
    }
]

export const NonUserLinks = [
    {
        label: "Signup",
        authRequired: false,
        apiHealthRequired: true,
        href: "/signup"
    },
    {
        label: "Login",
        authRequired: false,
        apiHealthRequired: true,
        href: "/login"
    }
]
export default NavLinks