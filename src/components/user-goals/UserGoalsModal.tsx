import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  UserGoals, 
  UserGoalsFormData, 
  PREDEFINED_TITLES, 
  PREDEFINED_INDUSTRIES, 
  PREDEFINED_BUSINESS_MODELS, 
  PREDEFINED_CITIES 
} from '@/types/userGoals';
import { X, Plus } from 'lucide-react';

interface UserGoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goals: UserGoals) => void;
  initialGoals?: UserGoals;
}

export function UserGoalsModal({ isOpen, onClose, onSave, initialGoals }: UserGoalsModalProps) {
  const [formData, setFormData] = useState<UserGoalsFormData>({
    targetTitles: [],
    minimumSalary: '',
    companyMaturity: 'either',
    workType: 'flexible',
    industries: [],
    businessModels: [],
    dealBreakers: {
      mustBeRemote: false,
      mustBeStartup: false,
      mustBePublicCompany: false,
      salaryMinimum: ''
    },
    preferredCities: [],
    openToRelocation: true
  });

  const [customTitle, setCustomTitle] = useState('');
  const [customIndustry, setCustomIndustry] = useState('');
  const [customBusinessModel, setCustomBusinessModel] = useState('');
  const [customCity, setCustomCity] = useState('');

  useEffect(() => {
    if (initialGoals) {
      setFormData({
        targetTitles: initialGoals.targetTitles,
        minimumSalary: initialGoals.minimumSalary.toString(),
        companyMaturity: initialGoals.companyMaturity,
        workType: initialGoals.workType,
        industries: initialGoals.industries,
        businessModels: initialGoals.businessModels,
        dealBreakers: {
          mustBeRemote: initialGoals.dealBreakers.mustBeRemote,
          mustBeStartup: initialGoals.dealBreakers.mustBeStartup,
          mustBePublicCompany: initialGoals.dealBreakers.mustBePublicCompany,
          salaryMinimum: initialGoals.dealBreakers.salaryMinimum?.toString() || ''
        },
        preferredCities: initialGoals.preferredCities,
        openToRelocation: initialGoals.openToRelocation
      });
    }
  }, [initialGoals]);

  const handleSave = () => {
    const goals: UserGoals = {
      targetTitles: formData.targetTitles,
      minimumSalary: parseInt(formData.minimumSalary) || 0,
      companyMaturity: formData.companyMaturity,
      workType: formData.workType,
      industries: formData.industries,
      businessModels: formData.businessModels,
      dealBreakers: {
        mustBeRemote: formData.dealBreakers.mustBeRemote,
        mustBeStartup: formData.dealBreakers.mustBeStartup,
        mustBePublicCompany: formData.dealBreakers.mustBePublicCompany,
        salaryMinimum: formData.dealBreakers.salaryMinimum ? parseInt(formData.dealBreakers.salaryMinimum) : null
      },
      preferredCities: formData.preferredCities,
      openToRelocation: formData.openToRelocation
    };
    onSave(goals);
    onClose();
  };

  const addCustomItem = (type: 'title' | 'industry' | 'businessModel' | 'city', value: string) => {
    if (!value.trim()) return;
    
    const cleanValue = value.trim();
    switch (type) {
      case 'title':
        if (!formData.targetTitles.includes(cleanValue)) {
          setFormData(prev => ({ ...prev, targetTitles: [...prev.targetTitles, cleanValue] }));
        }
        setCustomTitle('');
        break;
      case 'industry':
        if (!formData.industries.includes(cleanValue)) {
          setFormData(prev => ({ ...prev, industries: [...prev.industries, cleanValue] }));
        }
        setCustomIndustry('');
        break;
      case 'businessModel':
        if (!formData.businessModels.includes(cleanValue)) {
          setFormData(prev => ({ ...prev, businessModels: [...prev.businessModels, cleanValue] }));
        }
        setCustomBusinessModel('');
        break;
      case 'city':
        if (!formData.preferredCities.includes(cleanValue)) {
          setFormData(prev => ({ ...prev, preferredCities: [...prev.preferredCities, cleanValue] }));
        }
        setCustomCity('');
        break;
    }
  };

  const removeItem = (type: 'title' | 'industry' | 'businessModel' | 'city', value: string) => {
    switch (type) {
      case 'title':
        setFormData(prev => ({ ...prev, targetTitles: prev.targetTitles.filter(item => item !== value) }));
        break;
      case 'industry':
        setFormData(prev => ({ ...prev, industries: prev.industries.filter(item => item !== value) }));
        break;
      case 'businessModel':
        setFormData(prev => ({ ...prev, businessModels: prev.businessModels.filter(item => item !== value) }));
        break;
      case 'city':
        setFormData(prev => ({ ...prev, preferredCities: prev.preferredCities.filter(item => item !== value) }));
        break;
    }
  };

  const togglePredefinedItem = (type: 'title' | 'industry' | 'businessModel' | 'city', value: string) => {
    switch (type) {
      case 'title':
        if (formData.targetTitles.includes(value)) {
          removeItem('title', value);
        } else {
          setFormData(prev => ({ ...prev, targetTitles: [...prev.targetTitles, value] }));
        }
        break;
      case 'industry':
        if (formData.industries.includes(value)) {
          removeItem('industry', value);
        } else {
          setFormData(prev => ({ ...prev, industries: [...prev.industries, value] }));
        }
        break;
      case 'businessModel':
        if (formData.businessModels.includes(value)) {
          removeItem('businessModel', value);
        } else {
          setFormData(prev => ({ ...prev, businessModels: [...prev.businessModels, value] }));
        }
        break;
      case 'city':
        if (formData.preferredCities.includes(value)) {
          removeItem('city', value);
        } else {
          setFormData(prev => ({ ...prev, preferredCities: [...prev.preferredCities, value] }));
        }
        break;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Career Goals</DialogTitle>
          <DialogDescription>
            Set your career preferences to get personalized cover letter recommendations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Target Titles */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Target Job Titles</Label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {formData.targetTitles.map((title) => (
                  <Badge key={title} variant="secondary" className="flex items-center gap-1">
                    {title}
                    <X 
                      className="h-3 w-3 cursor-pointer hover:text-destructive" 
                      onClick={() => removeItem('title', title)}
                    />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom title..."
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomItem('title', customTitle)}
                />
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => addCustomItem('title', customTitle)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {PREDEFINED_TITLES.slice(0, 10).map((title) => (
                  <Badge
                    key={title}
                    variant={formData.targetTitles.includes(title) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => togglePredefinedItem('title', title)}
                  >
                    {title}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Salary & Company Preferences */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="salary" className="text-base font-medium">Minimum Salary</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">$</span>
                <Input
                  id="salary"
                  type="number"
                  placeholder="80000"
                  value={formData.minimumSalary}
                  onChange={(e) => setFormData(prev => ({ ...prev, minimumSalary: e.target.value }))}
                />
                <span className="text-sm text-muted-foreground">/year</span>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">Company Maturity</Label>
              <div className="space-y-2">
                {[
                  { value: 'startup', label: 'Startup (any stage)' },
                  { value: 'public', label: 'Public Company' },
                  { value: 'either', label: 'Either' }
                ].map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id={option.value}
                      name="companyMaturity"
                      value={option.value}
                      checked={formData.companyMaturity === option.value}
                      onChange={(e) => setFormData(prev => ({ ...prev, companyMaturity: e.target.value as any }))}
                      className="h-4 w-4"
                    />
                    <Label htmlFor={option.value} className="text-sm">{option.label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Work Type */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Work Type</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { value: 'remote', label: 'Remote' },
                { value: 'hybrid', label: 'Hybrid' },
                { value: 'in-person', label: 'In-person' },
                { value: 'flexible', label: 'Flexible' }
              ].map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id={option.value}
                    name="workType"
                    value={option.value}
                    checked={formData.workType === option.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, workType: e.target.value as any }))}
                    className="h-4 w-4"
                  />
                  <Label htmlFor={option.value} className="text-sm">{option.label}</Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Industries */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Industries</Label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {formData.industries.map((industry) => (
                  <Badge key={industry} variant="secondary" className="flex items-center gap-1">
                    {industry}
                    <X 
                      className="h-3 w-3 cursor-pointer hover:text-destructive" 
                      onClick={() => removeItem('industry', industry)}
                    />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom industry..."
                  value={customIndustry}
                  onChange={(e) => setCustomIndustry(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomItem('industry', customIndustry)}
                />
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => addCustomItem('industry', customIndustry)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {PREDEFINED_INDUSTRIES.slice(0, 12).map((industry) => (
                  <Badge
                    key={industry}
                    variant={formData.industries.includes(industry) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => togglePredefinedItem('industry', industry)}
                  >
                    {industry}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Business Models */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Business Models</Label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {formData.businessModels.map((model) => (
                  <Badge key={model} variant="secondary" className="flex items-center gap-1">
                    {model}
                    <X 
                      className="h-3 w-3 cursor-pointer hover:text-destructive" 
                      onClick={() => removeItem('businessModel', model)}
                    />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom business model..."
                  value={customBusinessModel}
                  onChange={(e) => setCustomBusinessModel(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomItem('businessModel', customBusinessModel)}
                />
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => addCustomItem('businessModel', customBusinessModel)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {PREDEFINED_BUSINESS_MODELS.slice(0, 10).map((model) => (
                  <Badge
                    key={model}
                    variant={formData.businessModels.includes(model) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => togglePredefinedItem('businessModel', model)}
                  >
                    {model}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Location */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Preferred Cities</Label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {formData.preferredCities.map((city) => (
                  <Badge key={city} variant="secondary" className="flex items-center gap-1">
                    {city}
                    <X 
                      className="h-3 w-3 cursor-pointer hover:text-destructive" 
                      onClick={() => removeItem('city', city)}
                    />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom city..."
                  value={customCity}
                  onChange={(e) => setCustomCity(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomItem('city', customCity)}
                />
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => addCustomItem('city', customCity)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {PREDEFINED_CITIES.slice(0, 12).map((city) => (
                  <Badge
                    key={city}
                    variant={formData.preferredCities.includes(city) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => togglePredefinedItem('city', city)}
                  >
                    {city}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="relocation"
                checked={formData.openToRelocation}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, openToRelocation: !!checked }))}
              />
              <Label htmlFor="relocation" className="text-sm">Open to relocation</Label>
            </div>
          </div>

          <Separator />

          {/* Deal Breakers */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Deal Breakers</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="mustBeRemote"
                  checked={formData.dealBreakers.mustBeRemote}
                  onCheckedChange={(checked) => setFormData(prev => ({ 
                    ...prev, 
                    dealBreakers: { ...prev.dealBreakers, mustBeRemote: !!checked }
                  }))}
                />
                <Label htmlFor="mustBeRemote" className="text-sm">Must be remote</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="mustBeStartup"
                  checked={formData.dealBreakers.mustBeStartup}
                  onCheckedChange={(checked) => setFormData(prev => ({ 
                    ...prev, 
                    dealBreakers: { ...prev.dealBreakers, mustBeStartup: !!checked }
                  }))}
                />
                <Label htmlFor="mustBeStartup" className="text-sm">Must be startup</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="mustBePublic"
                  checked={formData.dealBreakers.mustBePublicCompany}
                  onCheckedChange={(checked) => setFormData(prev => ({ 
                    ...prev, 
                    dealBreakers: { ...prev.dealBreakers, mustBePublicCompany: !!checked }
                  }))}
                />
                <Label htmlFor="mustBePublic" className="text-sm">Must be public company</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="salaryMinimum"
                  checked={!!formData.dealBreakers.salaryMinimum}
                  onCheckedChange={(checked) => {
                    if (!checked) {
                      setFormData(prev => ({ 
                        ...prev, 
                        dealBreakers: { ...prev.dealBreakers, salaryMinimum: '' }
                      }));
                    }
                  }}
                />
                <Label htmlFor="salaryMinimum" className="text-sm">Minimum salary requirement</Label>
                {formData.dealBreakers.salaryMinimum && (
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      type="number"
                      placeholder="100000"
                      value={formData.dealBreakers.salaryMinimum}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        dealBreakers: { ...prev.dealBreakers, salaryMinimum: e.target.value }
                      }))}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">/year</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Goals
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
