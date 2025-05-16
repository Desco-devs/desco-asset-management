// 'use client';

// import { useState } from 'react';

// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { toast } from 'sonner';
// import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
// import { createClient } from '@supabase/supabase-js';
// import { Label } from '@/components/ui/label';

// const ForgotWrapper = ({ onToggle }: { onToggle: () => void }) => {
//     const [email, setEmail] = useState('');
//     const [isLoading, setIsLoading] = useState(false);
//     const [isSuccess, setIsSuccess] = useState(false);
//     const supabase = createClient(
//         process.env.NEXT_PUBLIC_SUPABASE_URL!,
//         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
//     );

//     const handleResetPassword = async (e: React.FormEvent) => {
//         e.preventDefault();
//         setIsLoading(true);

//         try {
//             // Send password reset email using Supabase
//             const { error } = await supabase.auth.resetPasswordForEmail(email, {
//                 redirectTo: `${window.location.origin}/auth/callback?next=/reset-password/update`,
//             });

//             if (error) {
//                 throw error;
//             }

//             // Success - show success message
//             setIsSuccess(true);
//             toast.success('Password reset link sent! Check your email inbox.');
//         } catch (error: any) {
//             console.error('Password reset error:', error);
//             toast.error(error.message || 'Failed to send reset link');
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     return (
//         <Card className="w-full max-w-md mx-auto shadow-lg">
//             <CardHeader className="space-y-1">
//                 <CardTitle className="text-2xl font-bold text-center">
//                     <div className="flex flex-col items-center">
//                         <img className="h-16 mb-2" src="/images/logo.png" alt="logo" />
//                         <CardTitle className="text-xl font-semibold text-black">Ctrl Alt Work</CardTitle>
//                     </div>
//                 </CardTitle>

//             </CardHeader>
//             <CardContent>
//                 {isSuccess ? (
//                     <div className="text-center py-4">
//                         <div className="mb-4 text-green-600">
//                             <svg
//                                 xmlns="http://www.w3.org/2000/svg"
//                                 className="h-12 w-12 mx-auto"
//                                 fill="none"
//                                 viewBox="0 0 24 24"
//                                 stroke="currentColor"
//                             >
//                                 <path
//                                     strokeLinecap="round"
//                                     strokeLinejoin="round"
//                                     strokeWidth={2}
//                                     d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
//                                 />
//                             </svg>
//                         </div>
//                         <h3 className="text-lg font-medium">Check your email</h3>
//                         <p className="mt-2 text-sm text-gray-600">
//                             We've sent a password reset link to <strong>{email}</strong>
//                         </p>
//                         <p className="mt-4 text-sm text-gray-500">
//                             Don't see the email? Check your spam folder or try again.
//                         </p>
//                     </div>
//                 ) : (
//                     <form onSubmit={handleResetPassword} className="space-y-6">
//                         <div className="space-y-2">
//                             <Label htmlFor="email" className="text-sm font-medium mb-2 ml-1">
//                                 Email
//                             </Label>
//                             <Input
//                                 id="email"
//                                 type="email"
//                                 placeholder="your@example.com"
//                                 value={email}
//                                 onChange={(e) => setEmail(e.target.value)}
//                                 required
//                                 disabled={isLoading}
//                                 className="w-full"
//                             />
//                         </div>
//                         <Button
//                             type="submit"
//                             className="w-full"
//                             disabled={isLoading}
//                         >
//                             {isLoading ? 'Sending...' : 'Send Reset Link'}
//                         </Button>
//                     </form>
//                 )}
//             </CardContent>
//             <CardFooter className="flex flex-col space-y-2">

//                 <div className="text-center text-sm">
//                     <span>Remember your password? </span>
//                     <Button
//                         variant="link"
//                         className="p-0 h-auto underline-offset-4 font-thin text-blue-500 hover:text-blue-600"
//                         onClick={onToggle}
//                     >
//                         Back to login
//                     </Button>
//                 </div>
//             </CardFooter>
//         </Card>
//     );
// };

// export default ForgotWrapper;
